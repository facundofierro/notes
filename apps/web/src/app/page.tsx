"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@agelum/shadcn";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
import TaskKanban from "@/components/TaskKanban";
import EpicsKanban from "@/components/EpicsKanban";
import IdeasKanban from "@/components/IdeasKanban";
import { SettingsDialog } from "@/components/SettingsDialog";
import { MonochromeLogo } from "@agelum/shadcn";
import {
  Kanban,
  Files,
  Layers,
  FolderGit2,
  Lightbulb,
  BookOpen,
  Map,
  Terminal,
  Wrench,
  ListTodo,
  TestTube,
  Settings,
  LogIn,
  ChevronDown,
} from "lucide-react";
import dynamic from "next/dynamic";

const TerminalViewer = dynamic(
  () =>
    import("@/components/TerminalViewer").then(
      (mod) => mod.TerminalViewer
    ),
  { ssr: false }
);

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

type TestsSetupState =
  | "missing"
  | "initializing"
  | "installing"
  | "ready"
  | "error";

interface TestsSetupStatus {
  state: TestsSetupState;
  startedAt?: string;
  updatedAt: string;
  pid?: number;
  log: string;
  error?: string;
}

type ViewMode =
  | "ideas"
  | "docs"
  | "plan"
  | "epics"
  | "tasks"
  | "commands"
  | "cli-tools"
  | "browser"
  | "kanban"
  | "tests";

interface Task {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  epic?: string;
  assignee?: string;
  path?: string;
}

interface Epic {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  path?: string;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  state:
    | "thinking"
    | "important"
    | "priority"
    | "planned"
    | "done";
  createdAt: string;
  path?: string;
}

export default function Home() {
  const [
    repositories,
    setRepositories,
  ] = React.useState<string[]>([]);
  const [
    selectedRepo,
    setSelectedRepo,
  ] = React.useState<string | null>(
    null
  );
  const [currentPath, setCurrentPath] =
    React.useState<string>("");
  const [fileTree, setFileTree] =
    React.useState<FileNode | null>(
      null
    );
  const [
    selectedFile,
    setSelectedFile,
  ] = React.useState<{
    path: string;
    content: string;
  } | null>(null);
  const [basePath, setBasePath] =
    React.useState<string>("");
  const [viewMode, setViewMode] =
    React.useState<ViewMode>("epics");
  const [testOutput, setTestOutput] =
    React.useState<string>("");
  const [
    isTestRunning,
    setIsTestRunning,
  ] = React.useState(false);
  const [
    isTestDialogOpen,
    setIsTestDialogOpen,
  ] = React.useState(false);
  const [
    testsSetupStatus,
    setTestsSetupStatus,
  ] =
    React.useState<TestsSetupStatus | null>(
      null
    );
  const [
    isSetupLogsVisible,
    setIsSetupLogsVisible,
  ] = React.useState(true);
  const [
    workEditorEditing,
    setWorkEditorEditing,
  ] = React.useState(false);
  const [promptText, setPromptText] =
    React.useState("");
  const [agentTools, setAgentTools] =
    React.useState<
      Array<{
        name: string;
        displayName: string;
        available: boolean;
      }>
    >([]);
  const [
    rightSidebarView,
    setRightSidebarView,
  ] = React.useState<
    "prompt" | "terminal"
  >("prompt");
  const [
    workDocIsDraft,
    setWorkDocIsDraft,
  ] = React.useState(false);
  const [promptMode, setPromptMode] =
    React.useState<
      "agent" | "plan" | "chat"
    >("agent");
  const [docAiMode, setDocAiMode] =
    React.useState<"modify" | "start">(
      "modify"
    );
  const [
    toolModelsByTool,
    setToolModelsByTool,
  ] = React.useState<
    Record<string, string[]>
  >({});
  const [
    toolModelByTool,
    setToolModelByTool,
  ] = React.useState<
    Record<string, string>
  >({});
  const [
    isToolModelsLoading,
    setIsToolModelsLoading,
  ] = React.useState<
    Record<string, boolean>
  >({});
  const [
    terminalToolName,
    setTerminalToolName,
  ] = React.useState<string>("");
  const [
    terminalOutput,
    setTerminalOutput,
  ] = React.useState("");
  const [
    isTerminalRunning,
    setIsTerminalRunning,
  ] = React.useState(false);
  const [
    promptStatus,
    setPromptStatus,
  ] = React.useState("");
  const [
    isSettingsOpen,
    setIsSettingsOpen,
  ] = React.useState(false);

  const selectedRepoStorageKey =
    "agelum.selectedRepo";

  const joinFsPath = React.useCallback(
    (...parts: string[]) =>
      parts
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/"),
    []
  );

  React.useEffect(() => {
    fetch("/api/repositories")
      .then((res) => res.json())
      .then((data) => {
        const nextRepos =
          (data.repositories ||
            []) as string[];
        setRepositories(nextRepos);
        if (data.basePath)
          setBasePath(data.basePath);

        if (nextRepos.length > 0) {
          const saved =
            window.localStorage.getItem(
              selectedRepoStorageKey
            );
          const nextSelected =
            saved &&
            nextRepos.includes(saved)
              ? saved
              : nextRepos[0];
          setSelectedRepo(nextSelected);
        }
      });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/agents?action=tools")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const tools = (data.tools ||
          []) as Array<{
          name: string;
          displayName: string;
          available: boolean;
        }>;
        setAgentTools(tools);
      })
      .catch(() => {
        if (cancelled) return;
        setAgentTools([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedRepo) return;
    window.localStorage.setItem(
      selectedRepoStorageKey,
      selectedRepo
    );
  }, [selectedRepo]);

  const loadFileTree =
    React.useCallback(() => {
      if (selectedRepo) {
        let url = `/api/files?repo=${selectedRepo}`;
        if (viewMode === "ideas")
          url += "&path=doc/ideas";
        if (viewMode === "docs")
          url += "&path=doc/docs";
        if (viewMode === "plan")
          url += "&path=doc/plan";
        if (viewMode === "commands")
          url += "&path=ai/commands";
        if (viewMode === "cli-tools")
          url += "&path=ai/cli-tools";
        if (viewMode === "tests")
          url += "&path=work/tests";

        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            setFileTree(data.tree);
            setCurrentPath(
              data.rootPath
            );
          });
      }
    }, [selectedRepo, viewMode]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  React.useEffect(() => {
    if (viewMode !== "tests") return;
    if (!selectedRepo) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/tests/status?repo=${selectedRepo}`
        );
        const data =
          (await res.json()) as {
            status: TestsSetupStatus | null;
          };
        if (cancelled) return;
        setTestsSetupStatus(
          data.status
        );
        if (!data.status) return;
        if (
          data.status.state ===
            "ready" &&
          !data.status.error
        )
          return;
        setIsSetupLogsVisible(true);
      } catch {
        if (cancelled) return;
        setTestsSetupStatus(null);
      }
    };

    poll();
    const id = window.setInterval(
      poll,
      1500
    );
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [selectedRepo, viewMode]);

  const openWorkDraft =
    React.useCallback(
      (opts: {
        kind: "epic" | "task" | "idea";
        state: string;
      }) => {
        if (!selectedRepo) return;
        if (!basePath) return;
        const createdAt =
          new Date().toISOString();
        const id = `${opts.kind}-${Date.now()}`;

        const baseDir =
          opts.kind === "epic"
            ? joinFsPath(
                basePath,
                selectedRepo,
                ".agelum",
                "work",
                "epics",
                opts.state
              )
            : opts.kind === "task"
              ? joinFsPath(
                  basePath,
                  selectedRepo,
                  ".agelum",
                  "work",
                  "tasks",
                  opts.state
                )
              : joinFsPath(
                  basePath,
                  selectedRepo,
                  ".agelum",
                  "doc",
                  "ideas",
                  opts.state
                );

        const draftPath = joinFsPath(
          baseDir,
          `${id}.md`
        );

        const content = `---\ncreated: ${createdAt}\nstate: ${opts.state}\n---\n\n# ${id}\n\n`;
        setSelectedFile({
          path: draftPath,
          content,
        });
        setWorkEditorEditing(true);
        setWorkDocIsDraft(true);
        setRightSidebarView("prompt");
      },
      [
        basePath,
        joinFsPath,
        selectedRepo,
      ]
    );

  const terminalAbortControllerRef =
    React.useRef<AbortController | null>(
      null
    );

  const ensureModelsForTool =
    React.useCallback(
      async (toolName: string) => {
        if (toolModelsByTool[toolName])
          return;
        if (
          isToolModelsLoading[toolName]
        )
          return;

        setIsToolModelsLoading(
          (prev) => ({
            ...prev,
            [toolName]: true,
          })
        );

        try {
          const res = await fetch(
            `/api/agents?action=models&tool=${encodeURIComponent(toolName)}`
          );
          const data =
            (await res.json()) as {
              models?: string[];
            };
          const models = Array.isArray(
            data.models
          )
            ? data.models
            : [];

          setToolModelsByTool(
            (prev) => ({
              ...prev,
              [toolName]: models,
            })
          );

          if (
            models.length > 0 &&
            toolModelByTool[
              toolName
            ] === undefined
          ) {
            setToolModelByTool(
              (prev) => ({
                ...prev,
                [toolName]: models[0],
              })
            );
          }
        } catch {
          setToolModelsByTool(
            (prev) => ({
              ...prev,
              [toolName]: [],
            })
          );
        } finally {
          setIsToolModelsLoading(
            (prev) => ({
              ...prev,
              [toolName]: false,
            })
          );
        }
      },
      [
        isToolModelsLoading,
        toolModelByTool,
        toolModelsByTool,
      ]
    );

  const buildToolPrompt =
    React.useCallback(
      (opts: {
        promptText: string;
        mode: "agent" | "plan" | "chat";
        docMode: "modify" | "start";
        file: {
          path: string;
          content: string;
        };
        includeFile: boolean;
        viewMode: ViewMode;
        selectedRepo: string | null;
      }) => {
        const trimmed =
          opts.promptText.trim();
        if (!trimmed) return "";

        const contextInstructions = `
Context and Instructions:
1. You are working on a file at path: "${opts.file.path}".
2. The user request is: "${trimmed}".
3. If the user asks to create or modify a task/document, you should UPDATE the content of the file at "${opts.file.path}" or CREATE a new file if requested.
4. When creating a new file, ensure it has a valid filename and is placed in the correct directory.
5. If the user's request implies modifying the current document, apply the changes directly to the file content.
`;

        if (!opts.includeFile) {
          return `${contextInstructions}\n\nRequest:\n${trimmed}`;
        }

        const maxChars = 16000;
        const clippedContent =
          opts.file.content.length >
          maxChars
            ? `${opts.file.content.slice(0, maxChars)}\n\n[...truncated...]`
            : opts.file.content;

        return `${contextInstructions}\n\nCurrent File Content:\n${clippedContent}\n\nRequest:\n${trimmed}`;
      },
      []
    );

  const [
    terminalProcessId,
    setTerminalProcessId,
  ] = React.useState<string | null>(
    null
  );

  const cancelTerminal =
    React.useCallback(() => {
      terminalAbortControllerRef.current?.abort();
      terminalAbortControllerRef.current =
        null;
      setIsTerminalRunning(false);
      setTerminalProcessId(null);
      setTerminalOutput((prev) =>
        prev
          ? `${prev}\n\nCancelled`
          : "Cancelled"
      );
    }, []);

  const handleTerminalInput =
    React.useCallback(
      async (data: string) => {
        if (!terminalProcessId) return;

        try {
          await fetch(
            "/api/agents/input",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                id: terminalProcessId,
                data,
              }),
            }
          );
        } catch (error) {
          console.error(
            "Failed to send input:",
            error
          );
        }
      },
      [terminalProcessId]
    );

  const runTool = React.useCallback(
    async (toolName: string) => {
      if (!selectedFile) return;
      const trimmedPrompt =
        promptText.trim();
      if (!trimmedPrompt) return;

      terminalAbortControllerRef.current?.abort();
      const controller =
        new AbortController();
      terminalAbortControllerRef.current =
        controller;

      setTerminalToolName(toolName);
      setTerminalOutput("");
      setTerminalProcessId(null);
      setIsTerminalRunning(true);
      setRightSidebarView("terminal");

      const prompt = buildToolPrompt({
        promptText: trimmedPrompt,
        mode: promptMode,
        docMode: docAiMode,
        file: selectedFile,
        includeFile:
          !workDocIsDraft &&
          docAiMode === "modify",
        viewMode,
        selectedRepo,
      });

      const cwd =
        basePath && selectedRepo
          ? `${basePath}/${selectedRepo}`.replace(
              /\/+/g,
              "/"
            )
          : undefined;

      try {
        const res = await fetch(
          "/api/agents",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tool: toolName,
              prompt,
              model:
                toolModelByTool[
                  toolName
                ] || undefined,
              cwd,
            }),
            signal: controller.signal,
          }
        );

        const processId =
          res.headers.get(
            "X-Agent-Process-ID"
          );
        if (processId) {
          setTerminalProcessId(
            processId
          );
        }

        const reader =
          res.body?.getReader();
        if (!reader) {
          const fallbackText = res.ok
            ? ""
            : await res
                .text()
                .catch(() => "");
          setTerminalOutput(
            fallbackText ||
              "Tool execution failed"
          );
          return;
        }

        const decoder =
          new TextDecoder();
        while (true) {
          const { done, value } =
            await reader.read();
          if (done) break;
          const chunk = decoder.decode(
            value,
            {
              stream: true,
            }
          );
          if (chunk) {
            setTerminalOutput(
              (prev) => prev + chunk
            );
          }
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name === "AbortError"
        ) {
          setTerminalOutput((prev) =>
            prev
              ? `${prev}\n\nCancelled`
              : "Cancelled"
          );
          return;
        }
        setTerminalOutput(
          "Tool execution failed"
        );
      } finally {
        if (
          terminalAbortControllerRef.current ===
          controller
        ) {
          terminalAbortControllerRef.current =
            null;
        }
        setIsTerminalRunning(false);
      }
    },
    [
      buildToolPrompt,
      docAiMode,
      promptMode,
      promptText,
      selectedFile,
      toolModelByTool,
      workDocIsDraft,
      basePath,
      selectedRepo,
      viewMode,
    ]
  );

  const handleFileSelect = async (
    node: FileNode
  ) => {
    if (node.type === "file") {
      const content = await fetch(
        `/api/file?path=${encodeURIComponent(node.path)}`
      ).then((res) => res.json());
      setSelectedFile({
        path: node.path,
        content: content.content || "",
      });
      setWorkEditorEditing(false);
      setWorkDocIsDraft(false);
      setRightSidebarView("prompt");
    }
  };

  const handleTaskSelect = (
    task: Task
  ) => {
    if (!selectedRepo || !task.id)
      return;

    const fallbackPath =
      basePath && selectedRepo
        ? `${basePath}/${selectedRepo}/.agelum/work/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
        : "";

    const filePath =
      task.path || fallbackPath;
    if (!filePath) return;

    setWorkEditorEditing(false);
    setWorkDocIsDraft(false);
    setRightSidebarView("prompt");
    fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSelectedFile({
          path: filePath,
          content: data.content || "",
        });
      });
  };

  const handleEpicSelect = (
    epic: Epic
  ) => {
    if (!selectedRepo || !epic.id)
      return;

    const fallbackPath =
      basePath && selectedRepo
        ? `${basePath}/${selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
        : "";

    const filePath =
      epic.path || fallbackPath;
    if (!filePath) return;

    setWorkEditorEditing(false);
    setWorkDocIsDraft(false);
    setRightSidebarView("prompt");
    fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSelectedFile({
          path: filePath,
          content: data.content || "",
        });
      });
  };

  const handleIdeaSelect = (
    idea: Idea
  ) => {
    if (!selectedRepo || !idea.id)
      return;

    const fallbackPath =
      basePath && selectedRepo
        ? `${basePath}/${selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
        : "";

    const filePath =
      idea.path || fallbackPath;
    if (!filePath) return;

    setWorkEditorEditing(false);
    setWorkDocIsDraft(false);
    setRightSidebarView("prompt");
    fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSelectedFile({
          path: filePath,
          content: data.content || "",
        });
      });
  };

  const handleRunTest = async (
    path: string
  ) => {
    setTestOutput("");
    setIsTestRunning(true);
    setIsTestDialogOpen(true);

    try {
      const response = await fetch(
        "/api/tests/run",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path,
          }),
        }
      );

      const reader =
        response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } =
          await reader.read();
        if (done) break;
        const text =
          new TextDecoder().decode(
            value
          );
        setTestOutput(
          (prev) => prev + text
        );
      }
    } catch (error) {
      setTestOutput(
        (prev) =>
          prev + "\nError running test"
      );
    } finally {
      setIsTestRunning(false);
    }
  };

  const renderWorkEditor = (opts: {
    onBack: () => void;
    onRename?: (
      newTitle: string
    ) => Promise<{
      path: string;
      content: string;
    } | void>;
  }) => {
    if (!selectedFile) return null;

    const filteredTools = agentTools;

    return (
      <div className="flex h-full">
        <div className="flex overflow-hidden flex-1 border-r border-gray-800">
          <FileViewer
            file={selectedFile}
            onFileSaved={loadFileTree}
            editing={workEditorEditing}
            onEditingChange={
              setWorkEditorEditing
            }
            onBack={opts.onBack}
            onRename={opts.onRename}
          />
        </div>
        <div
          className={`flex overflow-hidden flex-col bg-gray-900 border-l border-gray-800 transition-all duration-300 ${
            rightSidebarView ===
              "terminal" &&
            isTerminalRunning
              ? "w-[50%]"
              : "w-[360px]"
          }`}
        >
          {rightSidebarView ===
          "terminal" ? (
            <div className="flex overflow-hidden flex-col flex-1 h-full">
              <div className="flex-1 min-h-0 bg-black">
                {terminalOutput ||
                isTerminalRunning ? (
                  <TerminalViewer
                    output={
                      terminalOutput ||
                      (isTerminalRunning
                        ? "Initializing..."
                        : "")
                    }
                    className="w-full h-full"
                    onInput={
                      handleTerminalInput
                    }
                  />
                ) : (
                  <div className="flex justify-center items-center h-full text-xs text-gray-500">
                    No terminal output
                  </div>
                )}
              </div>
              <div className="flex justify-end p-2 border-t border-gray-800">
                <button
                  onClick={() => {
                    if (
                      isTerminalRunning
                    ) {
                      cancelTerminal();
                    } else {
                      setRightSidebarView(
                        "prompt"
                      );
                    }
                  }}
                  className={`px-3 py-2 w-full text-sm text-white rounded transition-colors ${
                    isTerminalRunning
                      ? "border border-red-800 bg-red-900/50 hover:bg-red-900"
                      : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                  }`}
                >
                  {isTerminalRunning
                    ? "Cancel"
                    : "Back to Prompt"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex overflow-hidden flex-col flex-1">
              <div className="flex gap-2 p-3 border-b border-gray-800">
                {!workDocIsDraft && (
                  <div className="flex flex-1 p-1 rounded-lg border border-gray-800 bg-gray-950">
                    <button
                      onClick={() =>
                        setDocAiMode(
                          "modify"
                        )
                      }
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                        docAiMode ===
                        "modify"
                          ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      Modify
                    </button>
                    <button
                      onClick={() =>
                        setDocAiMode(
                          "start"
                        )
                      }
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                        docAiMode ===
                        "start"
                          ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      Start
                    </button>
                  </div>
                )}

                <div className="flex relative flex-1 justify-end items-center">
                  <select
                    value={promptMode}
                    onChange={(e) =>
                      setPromptMode(
                        e.target
                          .value as any
                      )
                    }
                    className="pr-6 w-full h-full text-xs text-right text-gray-300 bg-transparent appearance-none cursor-pointer outline-none hover:text-white"
                  >
                    <option
                      value="agent"
                      className="text-right bg-gray-800"
                    >
                      Agent
                    </option>
                    <option
                      value="plan"
                      className="text-right bg-gray-800"
                    >
                      Plan
                    </option>
                    <option
                      value="chat"
                      className="text-right bg-gray-800"
                    >
                      Chat
                    </option>
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="p-3 border-b border-gray-800">
                <textarea
                  value={promptText}
                  onChange={(e) =>
                    setPromptText(
                      e.target.value
                    )
                  }
                  className="px-3 py-2 w-full h-32 text-sm text-gray-100 bg-gray-800 rounded border border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Write a prompt…"
                />
              </div>

              <div className="flex overflow-auto flex-col flex-1">
                <div className="p-3 border-b border-gray-800">
                  <div className="grid grid-cols-2 gap-2">
                    {filteredTools.map(
                      (tool) => {
                        const models =
                          toolModelsByTool[
                            tool.name
                          ] || [];
                        const selectedModel =
                          toolModelByTool[
                            tool.name
                          ] || "";

                        return (
                          <div
                            key={
                              tool.name
                            }
                            onMouseEnter={() =>
                              void ensureModelsForTool(
                                tool.name
                              )
                            }
                            className={`flex flex-col w-full rounded-lg border overflow-hidden transition-all ${
                              tool.available
                                ? "border-gray-700 bg-gray-800 hover:border-gray-600 shadow-sm"
                                : "border-gray-800 bg-gray-900/50 opacity-50"
                            }`}
                          >
                            <button
                              onClick={() =>
                                runTool(
                                  tool.name
                                )
                              }
                              disabled={
                                !tool.available ||
                                !promptText.trim()
                              }
                              className="flex-1 px-3 py-3 text-left group disabled:opacity-50"
                            >
                              <div className="text-sm font-medium text-gray-100 group-hover:text-white mb-0.5">
                                {
                                  tool.displayName
                                }
                              </div>
                              <div className="text-[10px] text-gray-400">
                                Click to
                                run
                              </div>
                            </button>

                            <div className="p-1 border-t bg-gray-900/50 border-gray-700/50">
                              <select
                                value={
                                  selectedModel
                                }
                                onChange={(
                                  e
                                ) =>
                                  setToolModelByTool(
                                    (
                                      prev
                                    ) => ({
                                      ...prev,
                                      [tool.name]:
                                        e
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className="w-full bg-transparent text-[10px] text-gray-400 focus:text-gray-200 outline-none cursor-pointer py-0.5 px-1 rounded hover:bg-gray-800/50"
                                disabled={
                                  !tool.available
                                }
                              >
                                <option value="">
                                  Default
                                </option>
                                {models.map(
                                  (
                                    model
                                  ) => (
                                    <option
                                      key={
                                        model
                                      }
                                      value={
                                        model
                                      }
                                    >
                                      {
                                        model
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-6 items-center">
          <MonochromeLogo
            size="sm"
            color="text-white"
          />

          <div className="flex gap-1 items-center">
            {/* Doc Section */}
            <button
              onClick={() =>
                setViewMode("ideas")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "ideas"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Ideas
            </button>
            <button
              onClick={() =>
                setViewMode("docs")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "docs"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Docs
            </button>
            <button
              onClick={() =>
                setViewMode("plan")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "plan"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Map className="w-4 h-4" />
              Plan
            </button>

            <div className="mx-2 w-px h-6 bg-gray-700" />

            {/* Work Section */}
            <button
              onClick={() =>
                setViewMode("epics")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "epics"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Layers className="w-4 h-4" />
              Epics
            </button>
            <button
              onClick={() =>
                setViewMode("kanban")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() =>
                setViewMode("tests")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "tests"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <TestTube className="w-4 h-4" />
              Tests
            </button>

            <div className="mx-2 w-px h-6 bg-gray-700" />

            {/* AI Section */}
            <button
              onClick={() =>
                setViewMode("commands")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "commands"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Commands
            </button>
            <button
              onClick={() =>
                setViewMode("cli-tools")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "cli-tools"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Cli tools
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <select
              value={selectedRepo || ""}
              onChange={(e) =>
                setSelectedRepo(
                  e.target.value
                )
              }
              className="bg-transparent text-gray-100 text-sm border-none focus:ring-0 p-0 pr-6 min-w-[120px] appearance-none cursor-pointer hover:text-white font-medium"
            >
              <option
                value=""
                disabled
                className="bg-gray-800"
              >
                {repositories.length ===
                0
                  ? "No repositories found"
                  : "Select repository"}
              </option>
              {repositories.map(
                (repo) => (
                  <option
                    key={repo}
                    value={repo}
                    className="bg-gray-800"
                  >
                    {repo}
                  </option>
                )
              )}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="mx-2 w-px h-6 bg-gray-700" />

          <button
            onClick={() =>
              setIsSettingsOpen(true)
            }
            className="p-2 text-gray-400 rounded-lg transition-colors hover:text-white hover:bg-gray-700"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg text-sm transition-colors">
            <LogIn className="w-4 h-4" />
            Login
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden flex-col flex-1">
        <div className="flex overflow-hidden flex-1">
          {[
            "docs",
            "plan",
            "commands",
            "cli-tools",
            "tests",
          ].includes(viewMode) ? (
            <>
              <FileBrowser
                fileTree={fileTree}
                currentPath={
                  currentPath
                }
                onFileSelect={
                  handleFileSelect
                }
                basePath={basePath}
                onRefresh={loadFileTree}
                onRunFolder={
                  viewMode === "tests"
                    ? handleRunTest
                    : undefined
                }
              />
              {viewMode === "tests" ? (
                <div className="flex overflow-hidden flex-col flex-1 min-h-0">
                  {testsSetupStatus &&
                  testsSetupStatus.state !==
                    "ready" ? (
                    <div
                      className={`bg-gray-800 border-b border-gray-700 min-h-0 ${
                        isSetupLogsVisible
                          ? "flex-1 flex flex-col overflow-hidden"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-center px-3 py-2 flex-shrink-0">
                        <div className="text-sm text-gray-300">
                          Setup:{" "}
                          <span
                            className={`${
                              testsSetupStatus.state ===
                              "error"
                                ? "text-red-400"
                                : "text-yellow-300"
                            } ${
                              testsSetupStatus.state ===
                              "installing"
                                ? "animate-pulse"
                                : ""
                            }`}
                          >
                            {
                              testsSetupStatus.state
                            }
                            {testsSetupStatus.state ===
                              "installing" &&
                              "..."}
                          </span>
                          {testsSetupStatus.error
                            ? ` — ${testsSetupStatus.error}`
                            : ""}
                        </div>
                        <button
                          onClick={() =>
                            setIsSetupLogsVisible(
                              (v) => !v
                            )
                          }
                          className="px-2 py-1 text-xs text-gray-200 rounded transition-colors hover:text-white hover:bg-gray-700"
                        >
                          {isSetupLogsVisible
                            ? "Hide logs"
                            : "Show logs"}
                        </button>
                      </div>
                      {isSetupLogsVisible ? (
                        <div className="flex overflow-hidden flex-col flex-1 px-3 pb-3 min-h-0">
                          <div
                            ref={(
                              el
                            ) => {
                              if (el) {
                                el.scrollTop =
                                  el.scrollHeight;
                              }
                            }}
                            className="flex-1 p-3 font-mono text-xs text-gray-200 whitespace-pre-wrap bg-black rounded overflow-auto min-h-0"
                          >
                            {testsSetupStatus.log ||
                              `State: ${testsSetupStatus.state}`}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {(!testsSetupStatus ||
                    testsSetupStatus.state ===
                      "ready" ||
                    !isSetupLogsVisible) && (
                    <FileViewer
                      file={
                        selectedFile
                      }
                      onFileSaved={
                        loadFileTree
                      }
                      onRun={
                        handleRunTest
                      }
                      onRename={async (
                        newTitle
                      ) => {
                        if (
                          !selectedFile
                        )
                          return;
                        const oldPath =
                          selectedFile.path;
                        const dir =
                          oldPath
                            .split("/")
                            .slice(
                              0,
                              -1
                            )
                            .join("/");
                        const fileName =
                          oldPath
                            .split("/")
                            .pop() ||
                          "";
                        const ext =
                          fileName.includes(
                            "."
                          )
                            ? fileName
                                .split(
                                  "."
                                )
                                .pop()
                            : "";
                        const newPath = `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;

                        const res =
                          await fetch(
                            "/api/file",
                            {
                              method:
                                "POST",
                              headers: {
                                "Content-Type":
                                  "application/json",
                              },
                              body: JSON.stringify(
                                {
                                  path: oldPath,
                                  newPath:
                                    newPath,
                                  action:
                                    "rename",
                                }
                              ),
                            }
                          );

                        const data =
                          await res.json();
                        if (!res.ok)
                          throw new Error(
                            data.error ||
                              "Failed to rename file"
                          );

                        const next = {
                          path: data.path,
                          content:
                            selectedFile.content,
                        };
                        setSelectedFile(
                          next
                        );
                        loadFileTree();
                        return next;
                      }}
                    />
                  )}
                </div>
              ) : (
                <FileViewer
                  file={selectedFile}
                  onFileSaved={
                    loadFileTree
                  }
                  onRename={async (
                    newTitle
                  ) => {
                    if (!selectedFile)
                      return;
                    const oldPath =
                      selectedFile.path;
                    const dir = oldPath
                      .split("/")
                      .slice(0, -1)
                      .join("/");
                    const fileName =
                      oldPath
                        .split("/")
                        .pop() || "";
                    const ext =
                      fileName.includes(
                        "."
                      )
                        ? fileName
                            .split(".")
                            .pop()
                        : "";
                    const newPath = `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;

                    const res =
                      await fetch(
                        "/api/file",
                        {
                          method:
                            "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify(
                            {
                              path: oldPath,
                              newPath:
                                newPath,
                              action:
                                "rename",
                            }
                          ),
                        }
                      );

                    const data =
                      await res.json();
                    if (!res.ok)
                      throw new Error(
                        data.error ||
                          "Failed to rename file"
                      );

                    const next = {
                      path: data.path,
                      content:
                        selectedFile.content,
                    };
                    setSelectedFile(
                      next
                    );
                    loadFileTree();
                    return next;
                  }}
                />
              )}
            </>
          ) : viewMode === "ideas" ? (
            <div className="flex-1 bg-background">
              {selectedFile ? (
                renderWorkEditor({
                  onBack: () =>
                    setSelectedFile(
                      null
                    ),
                  onRename: selectedRepo
                    ? async (
                        newTitle: string
                      ) => {
                        const res =
                          await fetch(
                            "/api/ideas",
                            {
                              method:
                                "POST",
                              headers: {
                                "Content-Type":
                                  "application/json",
                              },
                              body: JSON.stringify(
                                {
                                  repo: selectedRepo,
                                  action:
                                    "rename",
                                  path: selectedFile.path,
                                  newTitle,
                                }
                              ),
                            }
                          );

                        const data =
                          await res.json();
                        if (!res.ok)
                          throw new Error(
                            data.error ||
                              "Failed to rename idea"
                          );

                        const next = {
                          path: data.path as string,
                          content:
                            data.content as string,
                        };
                        setSelectedFile(
                          next
                        );
                        return next;
                      }
                    : undefined,
                })
              ) : selectedRepo ? (
                <IdeasKanban
                  repo={selectedRepo}
                  onIdeaSelect={
                    handleIdeaSelect
                  }
                  onCreateIdea={({
                    state,
                  }) =>
                    openWorkDraft({
                      kind: "idea",
                      state,
                    })
                  }
                />
              ) : null}
            </div>
          ) : viewMode === "epics" ? (
            <div className="flex-1 bg-background">
              {selectedFile ? (
                renderWorkEditor({
                  onBack: () =>
                    setSelectedFile(
                      null
                    ),
                  onRename: selectedRepo
                    ? async (
                        newTitle: string
                      ) => {
                        const res =
                          await fetch(
                            "/api/epics",
                            {
                              method:
                                "POST",
                              headers: {
                                "Content-Type":
                                  "application/json",
                              },
                              body: JSON.stringify(
                                {
                                  repo: selectedRepo,
                                  action:
                                    "rename",
                                  path: selectedFile.path,
                                  newTitle,
                                }
                              ),
                            }
                          );

                        const data =
                          await res.json();
                        if (!res.ok)
                          throw new Error(
                            data.error ||
                              "Failed to rename epic"
                          );

                        const next = {
                          path: data.path as string,
                          content:
                            data.content as string,
                        };
                        setSelectedFile(
                          next
                        );
                        return next;
                      }
                    : undefined,
                })
              ) : selectedRepo ? (
                <EpicsKanban
                  repo={selectedRepo}
                  onEpicSelect={
                    handleEpicSelect
                  }
                  onCreateEpic={({
                    state,
                  }) =>
                    openWorkDraft({
                      kind: "epic",
                      state,
                    })
                  }
                />
              ) : null}
            </div>
          ) : (
            <div className="flex-1 bg-background">
              {selectedFile ? (
                renderWorkEditor({
                  onBack: () =>
                    setSelectedFile(
                      null
                    ),
                  onRename:
                    viewMode ===
                      "kanban" &&
                    selectedRepo
                      ? async (
                          newTitle: string
                        ) => {
                          const res =
                            await fetch(
                              "/api/tasks",
                              {
                                method:
                                  "POST",
                                headers:
                                  {
                                    "Content-Type":
                                      "application/json",
                                  },
                                body: JSON.stringify(
                                  {
                                    repo: selectedRepo,
                                    action:
                                      "rename",
                                    path: selectedFile.path,
                                    newTitle,
                                  }
                                ),
                              }
                            );

                          const data =
                            await res.json();
                          if (!res.ok)
                            throw new Error(
                              data.error ||
                                "Failed to rename task"
                            );

                          const next = {
                            path: data.path as string,
                            content:
                              data.content as string,
                          };
                          setSelectedFile(
                            next
                          );
                          return next;
                        }
                      : undefined,
                })
              ) : selectedRepo ? (
                <TaskKanban
                  repo={selectedRepo}
                  onTaskSelect={
                    handleTaskSelect
                  }
                  onCreateTask={({
                    state,
                  }) =>
                    openWorkDraft({
                      kind: "task",
                      state,
                    })
                  }
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={isTestDialogOpen}
        onOpenChange={
          setIsTestDialogOpen
        }
      >
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Test Execution
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 p-4 font-mono text-sm text-green-400 whitespace-pre-wrap bg-black rounded">
            {testOutput}
            {isTestRunning && (
              <span className="animate-pulse">
                _
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}
