import * as React from "react";
import { useSettings } from "@/hooks/use-settings";
import { usePromptBuilder, PromptBuilderOptions } from "./usePromptBuilder";
import { useAppLifecycle } from "./useAppLifecycle";
import { useTestsManager } from "./useTestsManager";
import { inferTestExecutionStatus } from "@/lib/test-output";

interface HomeState {
  repositories: { name: string; path: string; folderConfigId?: string }[];
  setRepositories: (val: any) => void;
  selectedRepo: string | null;
  setSelectedRepo: (val: string | null) => void;
  fileTree: any | null;
  setFileTree: (val: any) => void;
  selectedFile: { path: string; content: string } | null;
  setSelectedFile: (val: any) => void;
  basePath: string;
  setBasePath: (val: string) => void;
  viewMode: string;
  setViewMode: (val: string) => void;
  testViewMode: "steps" | "code" | "results";
  setTestViewMode: (val: "steps" | "code" | "results") => void;
  testOutput: string;
  setTestOutput: (val: string | ((prev: string) => string)) => void;
  isTestRunning: boolean;
  setIsTestRunning: (val: boolean) => void;
  testsSetupStatus: any;
  setTestsSetupStatus: (val: any) => void;
  isSetupLogsVisible: boolean;
  setIsSetupLogsVisible: (val: boolean) => void;
  workEditorEditing: boolean;
  setWorkEditorEditing: (val: boolean) => void;
  promptDrafts: Record<string, string>;
  setPromptDrafts: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  agentTools: any[];
  setAgentTools: (val: any) => void;
  rightSidebarView: "prompt" | "terminal" | "iframe";
  setRightSidebarView: (val: "prompt" | "terminal" | "iframe") => void;
  iframeUrl: string;
  setIframeUrl: (val: string) => void;
  projectConfig: any;
  setProjectConfig: (val: any) => void;
  isRecording: boolean;
  setIsRecording: (val: boolean) => void;
  filePickerOpen: boolean;
  setFilePickerOpen: (val: boolean) => void;
  fileSearch: string;
  setFileSearch: (val: string) => void;
  allFiles: { name: string; path: string }[];
  setAllFiles: (val: any) => void;
  fileMap: Record<string, string>;
  setFileMap: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  workDocIsDraft: boolean;
  setWorkDocIsDraft: (val: boolean) => void;
  promptMode: "agent" | "plan" | "chat";
  setPromptMode: (val: "agent" | "plan" | "chat") => void;
  docAiMode: "modify" | "start";
  setDocAiMode: (val: "modify" | "start") => void;
  toolModelsByTool: Record<string, string[]>;
  setToolModelsByTool: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  toolModelByTool: Record<string, string>;
  setToolModelByTool: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  isToolModelsLoading: Record<string, boolean>;
  setIsToolModelsLoading: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  terminalToolName: string;
  setTerminalToolName: (val: string) => void;
  terminalOutput: string;
  setTerminalOutput: (fn: (prev: string) => string) => void;
  isTerminalRunning: boolean;
  setIsTerminalRunning: (val: boolean) => void;
  terminalProcessId: string | null;
  setTerminalProcessId: (val: string | null) => void;
  appLogsAbortControllerRef: React.MutableRefObject<AbortController | null>;
  appLogs: string;
  setAppLogs: (fn: (prev: string) => string) => void;
  isAppStarting: boolean;
  setIsAppStarting: (val: boolean) => void;
  logStreamPid: number | null;
  setLogStreamPid: (val: number | null) => void;
  appPid: number | null;
  setAppPid: (val: number | null) => void;
  isAppRunning: boolean;
  setIsAppRunning: (val: boolean) => void;
  isAppManaged: boolean;
  setIsAppManaged: (val: boolean) => void;
  currentProjectPath: string | null;
  currentProjectConfig: any;
  currentProject: any;
  settings: any;
}

export function useHomeCallbacks(state: HomeState) {
  const { settings, refetch: refetchSettings } = useSettings();
  const { buildToolPrompt } = usePromptBuilder();
  const terminalAbortControllerRef = React.useRef<AbortController | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const browserIframeRef = React.useRef<HTMLIFrameElement>(null);

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
              ? `${prev[promptKey]}
![${data.name}](${data.path})`
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
  };
}
