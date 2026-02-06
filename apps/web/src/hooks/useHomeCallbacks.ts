import * as React from "react";
import { usePromptBuilder, PromptBuilderOptions } from "./usePromptBuilder";
import { useAppLifecycle } from "./useAppLifecycle";
import { useTestsManager } from "./useTestsManager";
import { inferTestExecutionStatus } from "@/lib/test-output";
import { HomeState } from "./useHomeState";

export function useHomeCallbacks(state: HomeState) {
  const { refetchSettings, settings } = state;
  const { buildToolPrompt } = usePromptBuilder();
  const terminalAbortControllerRef = React.useRef<AbortController | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const browserIframeRef = React.useRef<HTMLIFrameElement>(null);

  const activePromptKey =
    state.viewMode === "tests"
      ? `tests:${state.testViewMode}`
      : "default";
  
  const promptText = state.promptDrafts[activePromptKey] ?? "";

  const setPromptText = React.useCallback(
    (next: string | ((prev: string) => string)) => {
      state.setPromptDrafts((prev) => {
        const prevValue = prev[activePromptKey] ?? "";
        const nextValue = typeof next === "function" ? next(prevValue) : next;
        if (prev[activePromptKey] === nextValue) return prev;
        return {
          ...prev,
          [activePromptKey]: nextValue,
        };
      });
    },
    [state.setPromptDrafts, activePromptKey]
  );

  const joinFsPath = React.useCallback(
    (...parts: string[]) =>
      parts
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/"),
    []
  );

  const fetchRepositories = React.useCallback(() => {
    fetch("/api/repositories")
      .then((res) => res.json())
      .then((data) => {
        const nextRepos = (data.repositories || []) as {
          name: string;
          path: string;
        }[];
        state.setRepositories(nextRepos);
        if (data.basePath) state.setBasePath(data.basePath);

        if (nextRepos.length > 0) {
          const saved = window.localStorage.getItem("agelum.selectedRepo");
          const nextSelected =
            saved && nextRepos.some((r) => r.name === saved) ? saved : nextRepos[0].name;
          state.setSelectedRepo(nextSelected);
        }
      });
  }, [state]);

  const handleSettingsSave = React.useCallback(() => {
    fetchRepositories();
    refetchSettings();
  }, [fetchRepositories, refetchSettings]);

  const loadFileTree = React.useCallback(() => {
    if (state.selectedRepo) {
      let url = `/api/files?repo=${state.selectedRepo}`;
      if (state.viewMode === "ideas") url += "&path=doc/ideas";
      if (state.viewMode === "docs") url += "&path=doc/docs";
      if (state.viewMode === "ai") url += "&path=ai";
      if (state.viewMode === "tests") url += "&path=work/tests";
      if (state.viewMode === "review") url += "&path=work/review";

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          state.setFileTree(data.tree);
          if (state.viewMode === "tests") {
            const nextStatus = data.setupStatus ?? null;
            state.setTestsSetupStatus(nextStatus);
            if (!nextStatus) return;
            if (nextStatus.state === "ready" && !nextStatus.error) return;
            state.setIsSetupLogsVisible(true);
          }
        });
    }
  }, [state]);

  const openWorkDraft = React.useCallback(
    (opts: { kind: "epic" | "task" | "idea"; state: string }) => {
      if (!state.selectedRepo) return;

      const repo = state.repositories.find((r) => r.name === state.selectedRepo);
      const repoPath = repo?.path || (state.basePath ? joinFsPath(state.basePath, state.selectedRepo) : null);

      if (!repoPath) {
        console.error("Could not determine repository path");
        return;
      }

      const createdAt = new Date().toISOString();
      const id = `${opts.kind}-${Date.now()}`;

      const baseDir =
        opts.kind === "epic"
          ? joinFsPath(repoPath, ".agelum", "work", "epics", opts.state)
          : opts.kind === "task"
            ? joinFsPath(repoPath, ".agelum", "work", "tasks", opts.state)
            : joinFsPath(repoPath, ".agelum", "doc", "ideas", opts.state);

      const draftPath = joinFsPath(baseDir, `${id}.md`);
      const content = `---
created: ${createdAt}
state: ${opts.state}
---

# ${id}

`;

      state.setSelectedFile({
        path: draftPath,
        content,
      });
      state.setWorkEditorEditing(true);
      state.setWorkDocIsDraft(true);
      state.setRightSidebarView("prompt");
    },
    [state, joinFsPath]
  );

  const { handleStartApp, handleStopApp, handleRestartApp } = useAppLifecycle({
    selectedRepo: state.selectedRepo,
    currentProjectConfig: state.currentProjectConfig,
    currentProjectPath: state.currentProjectPath,
    appLogsAbortControllerRef: state.appLogsAbortControllerRef,
    setAppLogs: state.setAppLogs,
    setIsAppStarting: state.setIsAppStarting,
    setViewMode: state.setViewMode,
    setLogStreamPid: state.setLogStreamPid,
    setAppPid: state.setAppPid,
    setIsAppRunning: state.setIsAppRunning,
    setIsAppManaged: state.setIsAppManaged,
    setIframeUrl: state.setIframeUrl,
  });

  const { handleRunTest } = useTestsManager({
    selectedRepo: state.selectedRepo,
    testOutput: state.testOutput,
    setTestOutput: state.setTestOutput,
    isTestRunning: state.isTestRunning,
    setIsTestRunning: state.setIsTestRunning,
    setTestViewMode: state.setTestViewMode,
    setPromptDrafts: state.setPromptDrafts,
    testsSetupStatus: state.testsSetupStatus,
    setTestsSetupStatus: state.setTestsSetupStatus,
    setIsSetupLogsVisible: state.setIsSetupLogsVisible,
    viewMode: state.viewMode,
    testsSetupState: state.testsSetupStatus?.state ?? null,
  });

  const handleSaveFile = React.useCallback(
    async (opts: { path: string; content: string }) => {
      const res = await fetch("/api/file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: opts.path,
          content: opts.content,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save file");
      }

      state.setSelectedFile((prev: { path: string; content: string } | null) =>
        prev ? { ...prev, content: opts.content } : null
      );
    },
    [state]
  );

  const handleFileSelect = React.useCallback(
    async (node: any) => {
      if (node.type === "file") {
        const content = await fetch(
          `/api/file?path=${encodeURIComponent(node.path)}`
        ).then((res) => res.json());
        state.setSelectedFile({
          path: node.path,
          content: content.content || "",
        });
        state.setWorkEditorEditing(false);
        state.setWorkDocIsDraft(false);
        state.setRightSidebarView("prompt");
      }
    },
    [state]
  );

  const handleTaskSelect = React.useCallback(
    (task: any) => {
      if (!state.selectedRepo || !task.id) return;

      const fallbackPath =
        state.basePath && state.selectedRepo
          ? `${state.basePath}/${state.selectedRepo}/.agelum/work/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
          : "";

      const filePath = task.path || fallbackPath;
      if (!filePath) return;

      state.setWorkEditorEditing(false);
      state.setWorkDocIsDraft(false);
      state.setRightSidebarView("prompt");
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          state.setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [state]
  );

  const handleEpicSelect = React.useCallback(
    (epic: any) => {
      if (!state.selectedRepo || !epic.id) return;

      const fallbackPath =
        state.basePath && state.selectedRepo
          ? `${state.basePath}/${state.selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
          : "";

      const filePath = epic.path || fallbackPath;
      if (!filePath) return;

      state.setWorkEditorEditing(false);
      state.setWorkDocIsDraft(false);
      state.setRightSidebarView("prompt");
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          state.setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [state]
  );

  const handleIdeaSelect = React.useCallback(
    (idea: any) => {
      if (!state.selectedRepo || !idea.id) return;

      const fallbackPath =
        state.basePath && state.selectedRepo
          ? `${state.basePath}/${state.selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
          : "";

      const filePath = idea.path || fallbackPath;
      if (!filePath) return;

      state.setWorkEditorEditing(false);
      state.setWorkDocIsDraft(false);
      state.setRightSidebarView("prompt");
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          state.setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [state]
  );

  const handleCopyFullPrompt = React.useCallback(() => {
    if (!state.selectedFile) return;
    const prompt = buildToolPrompt({
      promptText: state.promptDrafts[state.viewMode === "tests" ? `tests:${state.testViewMode}` : "default"] ?? "",
      mode: state.promptMode,
      docMode: state.docAiMode,
      file: {
        path: state.selectedFile.path,
      },
      viewMode: state.viewMode as any,
      testContext:
        state.viewMode === "tests"
          ? {
              testViewMode: state.testViewMode,
              testOutput: state.testOutput,
              testStatus: inferTestExecutionStatus(state.testOutput, state.isTestRunning),
            }
          : undefined,
      selectedRepo: state.selectedRepo,
    } as PromptBuilderOptions);

    let finalPrompt = prompt;
    Object.entries(state.fileMap).forEach(([name, path]) => {
      finalPrompt = finalPrompt.split(`@${name}`).join(path);
    });

    navigator.clipboard.writeText(finalPrompt);
  }, [state, buildToolPrompt]);

  const handleRecordAudio = React.useCallback(() => {
    if (state.isRecording) {
      recognitionRef.current?.stop();
      state.setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        const promptKey = state.viewMode === "tests" ? `tests:${state.testViewMode}` : "default";
        state.setPromptDrafts((prev) => ({
          ...prev,
          [promptKey]: prev[promptKey] ? `${prev[promptKey]} ${finalTranscript}` : finalTranscript,
        }));
      }
    };

    recognition.onstart = () => state.setIsRecording(true);
    recognition.onend = () => state.setIsRecording(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      state.setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [state]);

  const handleFileUpload = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.path) {
          const promptKey = state.viewMode === "tests" ? `tests:${state.testViewMode}` : "default";
          state.setPromptDrafts((prev) => ({
            ...prev,
            [promptKey]: prev[promptKey]
              ? `${prev[promptKey]}\n![${data.name}](${data.path})`
              : `![${data.name}](${data.path})`,
          }));
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    },
    [state]
  );

  const fetchFiles = React.useCallback(async () => {
    if (!state.selectedRepo) return;
    try {
      const res = await fetch(`/api/files?repo=${state.selectedRepo}`);
      const data = await res.json();

      const flatten = (nodes: any[]): any[] => {
        return nodes.reduce(
          (acc, node) => {
            if (node.type === "file") {
              acc.push({
                name: node.name,
                path: node.path,
              });
            } else if (node.children) {
              acc.push(...flatten(node.children));
            }
            return acc;
          },
          []
        );
      };

      if (data.tree?.children) {
        state.setAllFiles(flatten(data.tree.children));
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  }, [state]);

  const cancelTerminal = React.useCallback(() => {
      terminalAbortControllerRef.current?.abort();
      terminalAbortControllerRef.current = null;
      state.setIsTerminalRunning(false);
      state.setTerminalProcessId(null);
      state.setTerminalOutput((prev) =>
        prev ? `${prev}\n\nCancelled` : "Cancelled"
      );
    }, [state]);

  const openInteractiveTerminal = React.useCallback(async () => {
      if (!state.selectedRepo) return;
      
      const cwd = state.basePath && state.selectedRepo
        ? `${state.basePath}/${state.selectedRepo}`.replace(/\/+/g, "/")
        : undefined;
      
      state.setTerminalToolName("Interactive Terminal");
      state.setTerminalOutput("");
      state.setTerminalProcessId(null);
      state.setIsTerminalRunning(true);
      state.setRightSidebarView("terminal");
      
      terminalAbortControllerRef.current = new AbortController();
      const ac = terminalAbortControllerRef.current;
      
      try {
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cwd }),
          signal: ac.signal,
        });
        
        const processId = res.headers.get("X-Agent-Process-ID");
        if (processId) {
          state.setTerminalProcessId(processId);
        }
        
        const reader = res.body?.getReader();
        if (!reader) {
          state.setTerminalOutput("Failed to open terminal");
          state.setIsTerminalRunning(false);
          return;
        }
        
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            state.setTerminalOutput((prev) => prev + chunk);
          }
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          state.setTerminalOutput(
            (prev) => `${prev}\nError: ${error.message}`
          );
        }
      } finally {
        if (terminalAbortControllerRef.current === ac) {
          terminalAbortControllerRef.current = null;
        }
        state.setIsTerminalRunning(false);
      }
    }, [state]);

    const handleTerminalInput = React.useCallback(
      async (data: string) => {
        if (!state.terminalProcessId) return;

        try {
          await fetch("/api/agents/input", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: state.terminalProcessId,
              data,
            }),
          });
        } catch (error) {
          console.error("Failed to send input:", error);
        }
      },
      [state.terminalProcessId]
    );

    const runTool = React.useCallback(
      async (toolName: string) => {
        if (!state.selectedFile) return;
        const trimmedPrompt = promptText.trim();
        if (!trimmedPrompt) return;

        terminalAbortControllerRef.current?.abort();
        const controller = new AbortController();
        terminalAbortControllerRef.current = controller;

        state.setTerminalToolName(toolName);
        state.setTerminalOutput("");
        state.setTerminalProcessId(null);
        state.setIsTerminalRunning(true);
        state.setRightSidebarView("terminal");

        const rawPrompt = buildToolPrompt({
          promptText: trimmedPrompt,
          mode: state.promptMode,
          docMode: state.docAiMode,
          file: {
            path: state.selectedFile.path,
          },
          viewMode: state.viewMode as any,
          testContext:
            state.viewMode === "tests"
              ? {
                  testViewMode: state.testViewMode,
                  testOutput: state.testOutput,
                  testStatus: inferTestExecutionStatus(
                    state.testOutput,
                    state.isTestRunning
                  ),
                }
              : undefined,
          selectedRepo: state.selectedRepo,
        } as PromptBuilderOptions);

        // Replace @mentions with full paths
        let prompt = rawPrompt;
        Object.entries(state.fileMap).forEach(([name, path]) => {
          prompt = prompt.split(`@${name}`).join(path);
        });

        const cwd =
          state.basePath && state.selectedRepo
            ? `${state.basePath}/${state.selectedRepo}`.replace(/\/+/g, "/")
            : undefined;

        try {
          const res = await fetch("/api/agents", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tool: toolName,
              prompt,
              model: state.toolModelByTool[toolName] || undefined,
              cwd,
            }),
            signal: controller.signal,
          });

          const processId = res.headers.get("X-Agent-Process-ID");
          if (processId) {
            state.setTerminalProcessId(processId);
          }

          const reader = res.body?.getReader();
          if (!reader) {
            const fallbackText = res.ok
              ? ""
              : await res.text().catch(() => "");
            state.setTerminalOutput(fallbackText || "Tool execution failed");
            return;
          }

          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, {
              stream: true,
            });
            if (chunk) {
              state.setTerminalOutput((prev) => prev + chunk);
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            state.setTerminalOutput((prev) =>
              prev ? `${prev}\n\nCancelled` : "Cancelled"
            );
            return;
          }
          state.setTerminalOutput("Tool execution failed");
        } finally {
          if (terminalAbortControllerRef.current === controller) {
            terminalAbortControllerRef.current = null;
          }
          state.setIsTerminalRunning(false);
        }
      },
      [
        state,
        buildToolPrompt,
        promptText
      ]
    );

  const handleInstallDeps = React.useCallback(async () => {
    if (!state.selectedRepo || !state.currentProject) return;
    const installCmd = "pnpm install";
    state.setTerminalToolName("Install Dependencies");
    state.setTerminalOutput(`Running: ${installCmd}\n`);
    state.setRightSidebarView("terminal");
    state.setIsTerminalRunning(true);

    terminalAbortControllerRef.current = new AbortController();
    const ac = terminalAbortControllerRef.current;

    try {
      const res = await fetch("/api/system/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: state.selectedRepo,
          command: installCmd,
        }),
        signal: ac.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        state.setTerminalOutput((prev) => `${prev}\nError: No response body`);
        state.setIsTerminalRunning(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.output) {
                state.setTerminalOutput((prev) => prev + data.output);
              }
            } catch {
              state.setTerminalOutput((prev) => prev + line + "\n");
            }
          }
        }
      }

      state.setIsTerminalRunning(false);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        state.setTerminalOutput((prev) => `${prev}\nError: ${error.message}`);
      }
      state.setIsTerminalRunning(false);
    }
  }, [state]);

  const handleBuildApp = React.useCallback(async () => {
    if (!state.selectedRepo || !state.currentProject) return;
    const buildCmd = state.currentProject.commands?.build || "pnpm build";
    state.setTerminalToolName("Build App");
    state.setTerminalOutput(`Running: ${buildCmd}\n`);
    state.setRightSidebarView("terminal");
    state.setIsTerminalRunning(true);

    terminalAbortControllerRef.current = new AbortController();
    const ac = terminalAbortControllerRef.current;

    try {
      const res = await fetch("/api/system/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: state.selectedRepo,
          command: buildCmd,
        }),
        signal: ac.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        state.setTerminalOutput((prev) => `${prev}\nError: No response body`);
        state.setIsTerminalRunning(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.output) {
                state.setTerminalOutput((prev) => prev + data.output);
              }
            } catch {
              state.setTerminalOutput((prev) => prev + line + "\n");
            }
          }
        }
      }

      state.setIsTerminalRunning(false);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        state.setTerminalOutput((prev) => `${prev}\nError: ${error.message}`);
      }
      state.setIsTerminalRunning(false);
    }
  }, [state]);

  const ensureModelsForTool = React.useCallback(
    async (toolName: string) => {
      if (state.toolModelsByTool[toolName]) return;
      if (state.isToolModelsLoading[toolName]) return;

      state.setIsToolModelsLoading((prev) => ({
        ...prev,
        [toolName]: true,
      }));

      try {
        const res = await fetch(
          `/api/agents?action=models&tool=${encodeURIComponent(toolName)}`
        );
        const data = (await res.json()) as { models?: string[] };
        const models = Array.isArray(data.models) ? data.models : [];

        state.setToolModelsByTool((prev) => ({
          ...prev,
          [toolName]: models,
        }) as Record<string, string[]>);

        if (models.length > 0 && state.toolModelByTool[toolName] === undefined) {
          state.setToolModelByTool((prev) => ({
            ...prev,
            [toolName]: models[0],
          }) as Record<string, string>);
        }
      } catch {
        state.setToolModelsByTool((prev) => ({
          ...prev,
          [toolName]: [],
        }));
      } finally {
        state.setIsToolModelsLoading((prev) => ({
          ...prev,
          [toolName]: false,
        }));
      }
    },
    [state]
  );
  
  const requestEmbeddedCapture = React.useCallback(() => {
    // Electron path: use native capturePage
    if (window.electronAPI?.browserView) {
      return window.electronAPI.browserView.capture();
    }

    // Fallback: iframe postMessage capture
    return new Promise<string | null>((resolve) => {
      const targetWindow = browserIframeRef.current?.contentWindow;
      if (!targetWindow) {
        resolve(null);
        return;
      }

      const captureId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const timeoutId = window.setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        resolve(null);
      }, 1500);

      const handleMessage = (event: MessageEvent) => {
        if (event.source !== targetWindow) {
          return;
        }
        const data = event.data;
        if (
          !data ||
          data.type !== "agelum:capture-response" ||
          data.id !== captureId
        ) {
          return;
        }
        window.clearTimeout(timeoutId);
        window.removeEventListener("message", handleMessage);
        if (typeof data.dataUrl === "string") {
          resolve(data.dataUrl);
        } else {
          resolve(null);
        }
      };

      window.addEventListener("message", handleMessage);
      targetWindow.postMessage(
        {
          type: "agelum:capture-request",
          id: captureId,
        },
        "*"
      );
    });
  }, [browserIframeRef]);

  return {
    fetchRepositories,
    handleSettingsSave,
    loadFileTree,
    openWorkDraft,
    handleStartApp,
    handleStopApp,
    handleRestartApp,
    handleRunTest,
    handleSaveFile,
    handleFileSelect,
    handleTaskSelect,
    handleEpicSelect,
    handleIdeaSelect,
    handleCopyFullPrompt,
    handleRecordAudio,
    handleFileUpload,
    fetchFiles,
    joinFsPath,
    terminalAbortControllerRef,
    recognitionRef,
    fileInputRef,
    browserIframeRef,
    promptText,
    setPromptText,
    cancelTerminal,
    openInteractiveTerminal,
    handleTerminalInput,
    runTool,
    handleInstallDeps,
    handleBuildApp,
    ensureModelsForTool,
    requestEmbeddedCapture,
  };
}
