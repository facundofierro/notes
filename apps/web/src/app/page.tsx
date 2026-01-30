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
  Play,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/use-settings";

const VIEW_MODE_CONFIG: Record<
  string,
  { label: string; icon: any }
> = {
  ideas: {
    label: "Ideas",
    icon: Lightbulb,
  },
  docs: {
    label: "Docs",
    icon: BookOpen,
  },
  plan: { label: "Plan", icon: Map },
  epics: {
    label: "Epics",
    icon: Layers,
  },
  kanban: {
    label: "Tasks",
    icon: ListTodo,
  },
  tests: {
    label: "Tests",
    icon: TestTube,
  },
  commands: {
    label: "Commands",
    icon: Terminal,
  },
  "cli-tools": {
    label: "Cli tools",
    icon: Wrench,
  },
};

const TerminalViewer = dynamic(
  () =>
    import("@/components/TerminalViewer").then(
      (mod) => mod.TerminalViewer,
    ),
  { ssr: false },
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
  const {
    settings,
    refetch: refetchSettings,
  } = useSettings();
  const [
    repositories,
    setRepositories,
  ] = React.useState<
    { name: string; path: string }[]
  >([]);
  const [
    selectedRepo,
    setSelectedRepo,
  ] = React.useState<string | null>(
    null,
  );
  const [currentPath, setCurrentPath] =
    React.useState<string>("");
  const [fileTree, setFileTree] =
    React.useState<FileNode | null>(
      null,
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
      null,
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
    "prompt" | "terminal" | "iframe"
  >("prompt");
  const [iframeUrl, setIframeUrl] =
    React.useState<string>("");
  const [
    isOpenCodeWebLoading,
    setIsOpenCodeWebLoading,
  ] = React.useState(false);
  const [
    openCodeWebLoadingLabel,
    setOpenCodeWebLoadingLabel,
  ] = React.useState("");
  const [
    openCodeWebError,
    setOpenCodeWebError,
  ] = React.useState("");
  const [
    pendingOpenCodeWebMessage,
    setPendingOpenCodeWebMessage,
  ] = React.useState<null | {
    sessionId: string;
    prompt: string;
    path?: string;
  }>(null);
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
      "modify",
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
    [],
  );

  const fetchRepositories =
    React.useCallback(() => {
      fetch("/api/repositories")
        .then((res) => res.json())
        .then((data) => {
          const nextRepos =
            (data.repositories ||
              []) as {
              name: string;
              path: string;
            }[];
          setRepositories(nextRepos);
          if (data.basePath)
            setBasePath(data.basePath);

          if (nextRepos.length > 0) {
            const saved =
              window.localStorage.getItem(
                selectedRepoStorageKey,
              );
            const nextSelected =
              saved &&
              nextRepos.some(
                (r) => r.name === saved,
              )
                ? saved
                : nextRepos[0].name;
            setSelectedRepo(
              nextSelected,
            );
          }
        });
    }, []);

  const handleSettingsSave =
    React.useCallback(() => {
      fetchRepositories();
      refetchSettings();
    }, [
      fetchRepositories,
      refetchSettings,
    ]);

  const visibleItems =
    React.useMemo(() => {
      const defaultItems = [
        "ideas",
        "docs",
        "plan",
        "epics",
        "kanban",
        "tests",
        "commands",
        "cli-tools",
      ];

      if (
        !selectedRepo ||
        !settings.projects
      ) {
        return defaultItems;
      }
      const project =
        settings.projects.find(
          (p) =>
            p.name === selectedRepo,
        );

      const workflowId =
        project?.workflowId ||
        settings.defaultWorkflowId;

      if (!workflowId) {
        return defaultItems;
      }

      const workflow =
        settings.workflows?.find(
          (w) => w.id === workflowId,
        );
      if (!workflow) {
        return defaultItems;
      }
      return workflow.items;
    }, [selectedRepo, settings]);

  React.useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

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
      selectedRepo,
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
              data.rootPath,
            );
            if (viewMode === "tests") {
              const nextStatus =
                (
                  data as {
                    setupStatus?: TestsSetupStatus | null;
                  }
                ).setupStatus ?? null;
              setTestsSetupStatus(
                nextStatus,
              );
              if (!nextStatus) return;
              if (
                nextStatus.state ===
                  "ready" &&
                !nextStatus.error
              )
                return;
              setIsSetupLogsVisible(
                true,
              );
            }
          });
      }
    }, [selectedRepo, viewMode]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  const testsSetupState =
    testsSetupStatus?.state ?? null;

  React.useEffect(() => {
    if (viewMode !== "tests") return;
    if (!selectedRepo) return;
    if (!testsSetupState) return;
    if (
      testsSetupState === "ready" ||
      testsSetupState === "error"
    )
      return;

    let cancelled = false;
    let intervalId: number | null =
      null;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/tests/status?repo=${selectedRepo}`,
        );
        const data =
          (await res.json()) as {
            status: TestsSetupStatus | null;
          };
        if (cancelled) return;
        setTestsSetupStatus(
          data.status,
        );

        if (!data.status) {
          if (intervalId !== null) {
            window.clearInterval(
              intervalId,
            );
            intervalId = null;
          }
          return;
        }

        if (
          data.status.state ===
            "ready" ||
          data.status.state === "error"
        ) {
          if (intervalId !== null) {
            window.clearInterval(
              intervalId,
            );
            intervalId = null;
          }
        }

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

    intervalId = window.setInterval(
      poll,
      1500,
    );
    poll();

    return () => {
      cancelled = true;
      if (intervalId !== null)
        window.clearInterval(
          intervalId,
        );
    };
  }, [
    selectedRepo,
    viewMode,
    testsSetupState,
  ]);

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
                opts.state,
              )
            : opts.kind === "task"
              ? joinFsPath(
                  basePath,
                  selectedRepo,
                  ".agelum",
                  "work",
                  "tasks",
                  opts.state,
                )
              : joinFsPath(
                  basePath,
                  selectedRepo,
                  ".agelum",
                  "doc",
                  "ideas",
                  opts.state,
                );

        const draftPath = joinFsPath(
          baseDir,
          `${id}.md`,
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
      ],
    );

  const terminalAbortControllerRef =
    React.useRef<AbortController | null>(
      null,
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
          }),
        );

        try {
          const res = await fetch(
            `/api/agents?action=models&tool=${encodeURIComponent(toolName)}`,
          );
          const data =
            (await res.json()) as {
              models?: string[];
            };
          const models = Array.isArray(
            data.models,
          )
            ? data.models
            : [];

          setToolModelsByTool(
            (prev) => ({
              ...prev,
              [toolName]: models,
            }),
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
              }),
            );
          }
        } catch {
          setToolModelsByTool(
            (prev) => ({
              ...prev,
              [toolName]: [],
            }),
          );
        } finally {
          setIsToolModelsLoading(
            (prev) => ({
              ...prev,
              [toolName]: false,
            }),
          );
        }
      },
      [
        isToolModelsLoading,
        toolModelByTool,
        toolModelsByTool,
      ],
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

        const filePath = opts.file.path;
        const normalizedPath =
          filePath.replace(/\\/g, "/");
        const fileName =
          normalizedPath
            .split("/")
            .pop() || "";
        const fileStem =
          fileName.replace(/\.md$/, "");
        const isEpicDoc =
          normalizedPath.includes(
            "/.agelum/work/epics/",
          ) ||
          opts.viewMode === "epics";
        const isTaskDoc =
          normalizedPath.includes(
            "/.agelum/work/tasks/",
          ) ||
          opts.viewMode === "kanban" ||
          opts.viewMode === "tasks";
        const isTestDoc =
          normalizedPath.includes(
            "/.agelum/work/tests/",
          ) ||
          opts.viewMode === "tests";

        const effectiveDocMode:
          | "modify"
          | "start" = isTestDoc
          ? "modify"
          : opts.docMode;

        const operation =
          effectiveDocMode === "modify"
            ? isTestDoc
              ? "modify_test"
              : "modify_document"
            : isEpicDoc
              ? "create_tasks_from_epic"
              : isTaskDoc
                ? "work_on_task"
                : "start";

        const operationInstructions =
          operation === "modify_test"
            ? [
                `- Modify the test file at "${filePath}".`,
                "- Keep changes minimal and focused on the request.",
              ]
            : operation ===
                "modify_document"
              ? [
                  `- Modify the document at "${filePath}".`,
                  "- Apply changes directly to that file.",
                ]
              : operation ===
                  "create_tasks_from_epic"
                ? [
                    `- Use the epic at "${filePath}" as the source of scope.`,
                    `- Epic id (from filename): "${fileStem}".`,
                    "- First, propose a list of tasks to create (titles + short descriptions + proposed file paths).",
                    "- Ask for confirmation before creating any new files.",
                    `- When creating task files, place them under ".agelum/work/tasks/pending/${fileStem}/" unless a different state is explicitly requested.`,
                  ]
                : operation ===
                    "work_on_task"
                  ? [
                      `- Use the task document at "${filePath}" as the source of requirements and acceptance criteria.`,
                      "- Make the necessary code changes in the repository to complete the task.",
                    ]
                  : [
                      `- Start work using "${filePath}" as context.`,
                    ];

        const contextInstructions = [
          "Context and Instructions:",
          `1. Current file path: "${filePath}".`,
          `2. Mode: "${effectiveDocMode}".`,
          `3. Operation: "${operation}".`,
          `4. User request: "${trimmed}".`,
          "5. Operation-specific instructions:",
          ...operationInstructions.map(
            (line) => `   ${line}`,
          ),
          "6. General rules:",
          `   - If the request implies changing the current document, update the file at "${filePath}".`,
          "   - When creating any new file, ensure it has a valid filename and is placed in the correct directory.",
        ].join("\n");

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
      [],
    );

  const [
    terminalProcessId,
    setTerminalProcessId,
  ] = React.useState<string | null>(
    null,
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
          : "Cancelled",
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
            },
          );
        } catch (error) {
          console.error(
            "Failed to send input:",
            error,
          );
        }
      },
      [terminalProcessId],
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
        includeFile: !workDocIsDraft,
        viewMode,
        selectedRepo,
      });

      const cwd =
        basePath && selectedRepo
          ? `${basePath}/${selectedRepo}`.replace(
              /\/+/g,
              "/",
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
          },
        );

        const processId =
          res.headers.get(
            "X-Agent-Process-ID",
          );
        if (processId) {
          setTerminalProcessId(
            processId,
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
              "Tool execution failed",
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
            },
          );
          if (chunk) {
            setTerminalOutput(
              (prev) => prev + chunk,
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
              : "Cancelled",
          );
          return;
        }
        setTerminalOutput(
          "Tool execution failed",
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
    ],
  );

  const handleFileSelect = async (
    node: FileNode,
  ) => {
    if (node.type === "file") {
      const content = await fetch(
        `/api/file?path=${encodeURIComponent(node.path)}`,
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
    task: Task,
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
      `/api/file?path=${encodeURIComponent(filePath)}`,
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
    epic: Epic,
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
      `/api/file?path=${encodeURIComponent(filePath)}`,
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
    idea: Idea,
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
      `/api/file?path=${encodeURIComponent(filePath)}`,
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
    path: string,
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
        },
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
            value,
          );
        setTestOutput(
          (prev) => prev + text,
        );
      }
    } catch (error) {
      setTestOutput(
        (prev) =>
          prev + "\nError running test",
      );
    } finally {
      setIsTestRunning(false);
    }
  };

  const renderWorkEditor = (opts: {
    onBack: () => void;
    onRename?: (
      newTitle: string,
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
            (rightSidebarView ===
              "terminal" &&
              isTerminalRunning) ||
            rightSidebarView ===
              "iframe"
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
                        "prompt",
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
          ) : rightSidebarView ===
            "iframe" ? (
            <div className="flex overflow-hidden flex-col flex-1 h-full">
              <div className="relative flex-1 min-h-0 bg-black">
                {iframeUrl ? (
                  <iframe
                    src={iframeUrl}
                    className="w-full h-full bg-black border-0"
                    onLoad={() => {
                      setIsOpenCodeWebLoading(
                        false,
                      );
                      const msg =
                        pendingOpenCodeWebMessage;
                      if (msg) {
                        setPendingOpenCodeWebMessage(
                          null,
                        );
                        void fetch(
                          "/api/opencode/message",
                          {
                            method:
                              "POST",
                            headers: {
                              "Content-Type":
                                "application/json",
                            },
                            body: JSON.stringify(
                              msg,
                            ),
                          },
                        ).catch(
                          () =>
                            undefined,
                        );
                      }
                    }}
                  />
                ) : (
                  <div className="flex justify-center items-center h-full text-xs text-gray-500">
                    {openCodeWebError ||
                      "No URL loaded"}
                  </div>
                )}

                {isOpenCodeWebLoading && (
                  <div className="absolute inset-0 flex flex-col gap-3 justify-center items-center bg-black">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                    <div className="text-xs text-gray-400">
                      {openCodeWebLoadingLabel ||
                        "Loading…"}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end p-2 border-t border-gray-800">
                <button
                  onClick={() => {
                    setRightSidebarView(
                      "prompt",
                    );
                    setIsOpenCodeWebLoading(
                      false,
                    );
                    setOpenCodeWebLoadingLabel(
                      "",
                    );
                    setOpenCodeWebError(
                      "",
                    );
                    setPendingOpenCodeWebMessage(
                      null,
                    );
                  }}
                  className="px-3 py-2 w-full text-sm text-white bg-gray-800 rounded border border-gray-700 transition-colors hover:bg-gray-700"
                >
                  Back to Prompt
                </button>
              </div>
            </div>
          ) : (
            <div className="flex overflow-hidden flex-col flex-1">
              <div className="flex gap-2 p-3 border-b border-gray-800">
                {viewMode ===
                "tests" ? (
                  <button
                    onClick={() =>
                      selectedFile &&
                      handleRunTest(
                        selectedFile.path,
                      )
                    }
                    disabled={
                      !selectedFile ||
                      isTestRunning
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-800 bg-gray-950 text-gray-200 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-950 disabled:hover:text-gray-200"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isTestRunning
                      ? "Running…"
                      : "Run test"}
                  </button>
                ) : (
                  !workDocIsDraft && (
                    <div className="flex flex-1 p-1 rounded-lg border border-gray-800 bg-gray-950">
                      <button
                        onClick={() =>
                          setDocAiMode(
                            "modify",
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
                            "start",
                          )
                        }
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                          docAiMode ===
                          "start"
                            ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {selectedFile?.path
                          ?.replace(
                            /\\/g,
                            "/",
                          )
                          .includes(
                            "/.agelum/work/epics/",
                          ) ||
                        viewMode ===
                          "epics"
                          ? "Create tasks"
                          : "Start"}
                      </button>
                    </div>
                  )
                )}

                <div className="flex relative flex-1 justify-end items-center">
                  <select
                    value={promptMode}
                    onChange={(e) =>
                      setPromptMode(
                        e.target
                          .value as any,
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
                      e.target.value,
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
                                tool.name,
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
                                  tool.name,
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
                                  e,
                                ) =>
                                  setToolModelByTool(
                                    (
                                      prev,
                                    ) => ({
                                      ...prev,
                                      [tool.name]:
                                        e
                                          .target
                                          .value,
                                    }),
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
                                    model,
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
                                  ),
                                )}
                              </select>
                            </div>
                          </div>
                        );
                      },
                    )}
                    <div className="flex overflow-hidden flex-col w-full bg-gray-800 rounded-lg border border-gray-700 shadow-sm transition-all hover:border-gray-600">
                      <button
                        onClick={async () => {
                          setRightSidebarView(
                            "iframe",
                          );
                          setIframeUrl(
                            "",
                          );
                          setOpenCodeWebError(
                            "",
                          );
                          setIsOpenCodeWebLoading(
                            true,
                          );
                          setOpenCodeWebLoadingLabel(
                            "Starting OpenCode…",
                          );
                          setPendingOpenCodeWebMessage(
                            null,
                          );
                          try {
                            let apiPath =
                              "/api/opencode";
                            const params =
                              new URLSearchParams();
                            let fullPath =
                              "";
                            if (
                              basePath &&
                              selectedRepo
                            ) {
                              const nextFullPath =
                                `${basePath}/${selectedRepo}`.replace(
                                  /\/+/g,
                                  "/",
                                );
                              fullPath =
                                nextFullPath;
                              params.set(
                                "path",
                                nextFullPath,
                              );
                            }
                            const trimmedPrompt =
                              promptText.trim();
                            if (
                              trimmedPrompt
                            ) {
                              params.set(
                                "deferPrompt",
                                "1",
                              );
                              params.set(
                                "createSession",
                                "1",
                              );
                            }
                            const queryString =
                              params.toString();
                            if (
                              queryString
                            ) {
                              apiPath += `?${queryString}`;
                            }
                            const res =
                              await fetch(
                                apiPath,
                              );
                            const data =
                              await res.json();
                            if (
                              data?.url
                            ) {
                              setIframeUrl(
                                data.url,
                              );
                              setOpenCodeWebLoadingLabel(
                                "Loading OpenCode Web…",
                              );
                              if (
                                trimmedPrompt &&
                                data?.sessionId
                              ) {
                                const prompt =
                                  buildToolPrompt(
                                    {
                                      promptText:
                                        trimmedPrompt,
                                      mode: promptMode,
                                      docMode:
                                        docAiMode,
                                      file: selectedFile!,
                                      includeFile:
                                        !workDocIsDraft,
                                      viewMode,
                                      selectedRepo,
                                    },
                                  );
                                setPendingOpenCodeWebMessage(
                                  {
                                    sessionId:
                                      data.sessionId,
                                    prompt:
                                      prompt,
                                    path:
                                      fullPath ||
                                      undefined,
                                  },
                                );
                              }
                            } else {
                              setIsOpenCodeWebLoading(
                                false,
                              );
                              setOpenCodeWebError(
                                "Failed to open OpenCode Web",
                              );
                            }
                          } catch {
                            setIsOpenCodeWebLoading(
                              false,
                            );
                            setOpenCodeWebError(
                              "Failed to open OpenCode Web",
                            );
                          }
                        }}
                        disabled={
                          isOpenCodeWebLoading
                        }
                        className="flex-1 px-3 py-3 text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="text-sm font-medium text-gray-100 group-hover:text-white mb-0.5">
                          OpenCode Web
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {isOpenCodeWebLoading
                            ? "Opening…"
                            : "Click to open"}
                        </div>
                      </button>
                      <div className="p-1 border-t bg-gray-900/50 border-gray-700/50">
                        <div className="w-full text-[10px] text-gray-500 py-0.5 px-1">
                          Web Interface
                        </div>
                      </div>
                    </div>
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
            {(() => {
              const standardOrder = [
                "ideas",
                "docs",
                "plan",
                "epics",
                "kanban",
                "tests",
                "commands",
                "cli-tools",
              ];
              return standardOrder.map(
                (mode) => {
                  if (
                    !visibleItems.includes(
                      mode,
                    )
                  )
                    return null;
                  const config =
                    VIEW_MODE_CONFIG[
                      mode
                    ];
                  if (!config)
                    return null;
                  const Icon =
                    config.icon;
                  return (
                    <button
                      key={mode}
                      onClick={() =>
                        setViewMode(
                          mode as ViewMode,
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        viewMode ===
                        mode
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                },
              );
            })()}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <select
              value={selectedRepo || ""}
              onChange={(e) =>
                setSelectedRepo(
                  e.target.value,
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
                    key={repo.name}
                    value={repo.name}
                    className="bg-gray-800"
                  >
                    {repo.name}
                  </option>
                ),
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
                          ? "flex overflow-hidden flex-col flex-1"
                          : ""
                      }`}
                    >
                      <div className="flex flex-shrink-0 justify-between items-center px-3 py-2">
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
                              (v) => !v,
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
                              el,
                            ) => {
                              if (el) {
                                el.scrollTop =
                                  el.scrollHeight;
                              }
                            }}
                            className="overflow-auto flex-1 p-3 min-h-0 font-mono text-xs text-gray-200 whitespace-pre-wrap bg-black rounded"
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
                    !isSetupLogsVisible) &&
                    (selectedFile ? (
                      renderWorkEditor({
                        onBack: () =>
                          setSelectedFile(
                            null,
                          ),
                        onRename:
                          async (
                            newTitle,
                          ) => {
                            if (
                              !selectedFile
                            )
                              return;
                            const oldPath =
                              selectedFile.path;
                            const dir =
                              oldPath
                                .split(
                                  "/",
                                )
                                .slice(
                                  0,
                                  -1,
                                )
                                .join(
                                  "/",
                                );
                            const fileName =
                              oldPath
                                .split(
                                  "/",
                                )
                                .pop() ||
                              "";
                            const ext =
                              fileName.includes(
                                ".",
                              )
                                ? fileName
                                    .split(
                                      ".",
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
                                  headers:
                                    {
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
                                    },
                                  ),
                                },
                              );

                            const data =
                              await res.json();
                            if (!res.ok)
                              throw new Error(
                                data.error ||
                                  "Failed to rename file",
                              );

                            const next =
                              {
                                path: data.path,
                                content:
                                  selectedFile.content,
                              };
                            setSelectedFile(
                              next,
                            );
                            loadFileTree();
                            return next;
                          },
                      })
                    ) : (
                      <div className="flex flex-1 justify-center items-center text-gray-500">
                        Select a test
                        file to view and
                        edit
                      </div>
                    ))}
                </div>
              ) : (
                <FileViewer
                  file={selectedFile}
                  onFileSaved={
                    loadFileTree
                  }
                  onRename={async (
                    newTitle,
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
                        ".",
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
                            },
                          ),
                        },
                      );

                    const data =
                      await res.json();
                    if (!res.ok)
                      throw new Error(
                        data.error ||
                          "Failed to rename file",
                      );

                    const next = {
                      path: data.path,
                      content:
                        selectedFile.content,
                    };
                    setSelectedFile(
                      next,
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
                      null,
                    ),
                  onRename: selectedRepo
                    ? async (
                        newTitle: string,
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
                                },
                              ),
                            },
                          );

                        const data =
                          await res.json();
                        if (!res.ok)
                          throw new Error(
                            data.error ||
                              "Failed to rename idea",
                          );

                        const next = {
                          path: data.path as string,
                          content:
                            data.content as string,
                        };
                        setSelectedFile(
                          next,
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
                      null,
                    ),
                  onRename: selectedRepo
                    ? async (
                        newTitle: string,
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
                                },
                              ),
                            },
                          );

                        const data =
                          await res.json();
                        if (!res.ok)
                          throw new Error(
                            data.error ||
                              "Failed to rename epic",
                          );

                        const next = {
                          path: data.path as string,
                          content:
                            data.content as string,
                        };
                        setSelectedFile(
                          next,
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
                      null,
                    ),
                  onRename:
                    viewMode ===
                      "kanban" &&
                    selectedRepo
                      ? async (
                          newTitle: string,
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
                                  },
                                ),
                              },
                            );

                          const data =
                            await res.json();
                          if (!res.ok)
                            throw new Error(
                              data.error ||
                                "Failed to rename task",
                            );

                          const next = {
                            path: data.path as string,
                            content:
                              data.content as string,
                          };
                          setSelectedFile(
                            next,
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
        onSave={handleSettingsSave}
      />
    </div>
  );
}
