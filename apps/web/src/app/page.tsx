"use client";

import * as React from "react";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
import TaskKanban from "@/components/TaskKanban";
import EpicsKanban from "@/components/EpicsKanban";
import IdeasKanban from "@/components/IdeasKanban";
import { SettingsDialog } from "@/components/SettingsDialog";
import { BrowserRightPanel } from "@/components/BrowserRightPanel";
import { ProjectSelector } from "@/components/ProjectSelector";
import { AgelumNotesLogo } from "@agelum/shadcn";
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
  Settings2,
  LogIn,
  ChevronDown,
  Play,
  Square,
  ScrollText,
  AtSign,
  Image as ImageIcon,
  Mic,
  Copy,
  Paperclip,
  Search,
  X,
  Globe,
  MoreVertical,
  RotateCw,
  Download,
  Hammer,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/use-settings";
import { VIEW_MODE_CONFIG, ViewMode } from "@/lib/view-config";
import {
  formatTestOutputForPrompt,
  inferTestExecutionStatus,
} from "@/lib/test-output";

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
    { name: string; path: string; folderConfigId?: string }[]
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
  const [
    testViewMode,
    setTestViewMode,
  ] = React.useState<
    "steps" | "code" | "results"
  >("code");
  const [testOutput, setTestOutput] =
    React.useState<string>("");
  const [
    isTestRunning,
    setIsTestRunning,
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
  const [
    promptDrafts,
    setPromptDrafts,
  ] = React.useState<
    Record<string, string>
  >({
    default: "",
    "tests:steps": "",
    "tests:code": "",
    "tests:results": "",
  });
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
    projectConfig,
    setProjectConfig,
  ] = React.useState<{
    url?: string;
    commands?: Record<string, string>;
    workflowId?: string;
  } | null>(null);
  const [isRecording, setIsRecording] =
    React.useState(false);
  const [
    filePickerOpen,
    setFilePickerOpen,
  ] = React.useState(false);
  const [fileSearch, setFileSearch] =
    React.useState("");
  const [allFiles, setAllFiles] =
    React.useState<
      { name: string; path: string }[]
    >([]);
  const [fileMap, setFileMap] =
    React.useState<
      Record<string, string>
    >({});
  const fileInputRef =
    React.useRef<HTMLInputElement>(
      null,
    );
  const browserIframeRef =
    React.useRef<HTMLIFrameElement>(
      null,
    );
  const recognitionRef =
    React.useRef<any>(null);
  const [
    isOpenCodeWebLoading,
    setIsOpenCodeWebLoading,
  ] = React.useState(false);
  const [
    openCodeWebLoadingLabel,
    setOpenCodeWebLoadingLabel,
  ] = React.useState("");

  const activePromptKey =
    viewMode === "tests"
      ? `tests:${testViewMode}`
      : "default";
  const promptText =
    promptDrafts[activePromptKey] ?? "";
  const setPromptText =
    React.useCallback(
      (
        next:
          | string
          | ((prev: string) => string),
      ) => {
        setPromptDrafts((prev) => {
          const prevValue =
            prev[activePromptKey] ?? "";
          const nextValue =
            typeof next === "function"
              ? next(prevValue)
              : next;
          if (
            prev[activePromptKey] ===
            nextValue
          ) {
            return prev;
          }
          return {
            ...prev,
            [activePromptKey]:
              nextValue,
          };
        });
      },
      [activePromptKey],
    );
  const requestEmbeddedCapture =
    React.useCallback(() => {
      return new Promise<string | null>(
        (resolve) => {
          const targetWindow =
            browserIframeRef.current
              ?.contentWindow;
          if (!targetWindow) {
            resolve(null);
            return;
          }

          const captureId =
            typeof crypto !== "undefined" &&
            "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()
                  .toString(16)
                  .slice(2)}`;

          const timeoutId =
            window.setTimeout(() => {
              window.removeEventListener(
                "message",
                handleMessage,
              );
              resolve(null);
            }, 1500);

          const handleMessage = (
            event: MessageEvent,
          ) => {
            if (
              event.source !==
              targetWindow
            ) {
              return;
            }
            const data = event.data;
            if (
              !data ||
              data.type !==
                "agelum:capture-response" ||
              data.id !== captureId
            ) {
              return;
            }
            window.clearTimeout(timeoutId);
            window.removeEventListener(
              "message",
              handleMessage,
            );
            if (
              typeof data.dataUrl ===
              "string"
            ) {
              resolve(data.dataUrl);
            } else {
              resolve(null);
            }
          };

          window.addEventListener(
            "message",
            handleMessage,
          );
          targetWindow.postMessage(
            {
              type: "agelum:capture-request",
              id: captureId,
            },
            "*",
          );
        },
      );
    }, []);
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
    openCodeSessionId,
    setOpenCodeSessionId,
  ] = React.useState<string | null>(
    null,
  );
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
  const [settingsTab, setSettingsTab] =
    React.useState<
      | "projects"
      | "agents"
      | "tests"
      | "defaults"
      | "workflows"
      | "project-config"
      | "project-commands"
      | "project-preview"
    >("defaults");
  const [
    isServiceRunning,
    setIsServiceRunning,
  ] = React.useState(false);
  const [
    isAppRunning,
    setIsAppRunning,
  ] = React.useState(false);
  const [
    isAppManaged,
    setIsAppManaged,
  ] = React.useState(false);
  const [appPid, setAppPid] =
    React.useState<number | null>(null);
  const [
    isAppActionsMenuOpen,
    setIsAppActionsMenuOpen,
  ] = React.useState(false);
  const [appLogs, setAppLogs] =
    React.useState<string>("");
  const [
    isAppStarting,
    setIsAppStarting,
  ] = React.useState(false);
  const appLogsAbortControllerRef =
    React.useRef<AbortController | null>(
      null,
    );
  const [
    logStreamPid,
    setLogStreamPid,
  ] = React.useState<number | null>(null);

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
      const defaultItems: ViewMode[] = [
        "ideas",
        "docs",
        "separator",
        "epics",
        "kanban",
        "tests",
        "review",
        "separator",
        "ai",
        "logs",
        "browser",
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
        if (viewMode === "ai")
          url += "&path=ai";
        if (viewMode === "tests")
          url += "&path=work/tests";
        if (viewMode === "review")
          url += "&path=work/review";

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

  React.useEffect(() => {
    setSelectedFile(null);
  }, [viewMode, selectedRepo]);

  // Clear log streaming when repo changes
  React.useEffect(() => {
    setLogStreamPid(null);
    setAppLogs("");
  }, [selectedRepo]);

  React.useEffect(() => {
    if (viewMode === "ai") {
      setDocAiMode("modify");
    }
  }, [viewMode]);

  const currentProject = React.useMemo(() => {
    if (!selectedRepo || !settings.projects) return null;
    return settings.projects.find((p) => p.name === selectedRepo);
  }, [selectedRepo, settings]);

  const currentProjectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)
        ?.path || currentProject?.path || null
    );
  }, [currentProject?.path, repositories, selectedRepo]);

  const currentProjectConfig = React.useMemo(() => {
    // Project config is merged in the useSettings hook via API
    // But also check the fetched projectConfig from the filesystem
    return currentProject || projectConfig || null;
  }, [currentProject, projectConfig]);

  const testsSetupState =
    testsSetupStatus?.state ?? null;

  // Fetch project configuration from filesystem when repo or project path changes
  React.useEffect(() => {
    if (!currentProjectPath) {
      setProjectConfig(null);
      return;
    }

    let cancelled = false;

    const fetchConfig = async () => {
      try {
        const res = await fetch(
          `/api/project/config?path=${encodeURIComponent(currentProjectPath)}`
        );
        if (!res.ok) {
          console.error("Failed to fetch project config");
          return;
        }
        const data = (await res.json()) as {
          config: {
            url?: string;
            commands?: Record<string, string>;
            workflowId?: string;
          };
        };
        if (!cancelled) {
          setProjectConfig(data.config || null);
        }
      } catch (error) {
        console.error("Error fetching project config:", error);
      }
    };

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [currentProjectPath]);

  // Sync iframeUrl with project url (only for browser view, not OpenCode)
  React.useEffect(() => {
    // Only set iframe URL to project URL when on browser tab
    // Don't overwrite if it's an OpenCode URL (port 9988)
    if (viewMode === "browser") {
      if (currentProjectConfig?.url) {
        setIframeUrl(currentProjectConfig.url);
      } else {
        setIframeUrl("");
      }
    }
  }, [currentProjectConfig?.url, viewMode]);

  // Poll app status
  React.useEffect(() => {
    if (!selectedRepo || !currentProjectConfig?.url) {
      setIsAppRunning(false);
      setIsAppManaged(false);
      setAppPid(null);
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/app-status?repo=${selectedRepo}`);
        const data = (await res.json()) as {
          isRunning: boolean;
          isManaged: boolean;
          pid?: number | null;
          startedAt?: string;
          command?: string;
        };

        if (cancelled) return;

    if (
      data.isRunning !== isAppRunning ||
      data.isManaged !== isAppManaged ||
      (data.pid || null) !== appPid
    ) {
      setIsAppRunning(data.isRunning);
      setIsAppManaged(data.isManaged);
      setAppPid(data.pid || null);
    }
      } catch (error) {
        if (cancelled) return;
        setIsAppRunning(false);
        setIsAppManaged(false);
        setAppPid(null);
      }
    };

    // Check immediately
    checkStatus();

    // Check when window gets focus
    const handleFocus = () => checkStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedRepo, currentProjectConfig?.url]);

  // Stream app logs and detect when app is ready
  React.useEffect(() => {
    if (!logStreamPid) {
      return;
    }

    let cancelled = false;
    let lastLogTime = Date.now();
    let hasLoggedRecently = false;
    let startTimeoutId: number | null = null;

    const streamLogs = async () => {
      appLogsAbortControllerRef.current = new AbortController();
      const ac = appLogsAbortControllerRef.current;

      try {
        const res = await fetch(`/api/app-logs?pid=${logStreamPid}`, {
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          setAppLogs((prev) => prev + "\x1b[31mError: Failed to stream logs\x1b[0m\n");
          setIsAppStarting(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (startTimeoutId !== null) {
          window.clearTimeout(startTimeoutId);
        }
        startTimeoutId = window.setTimeout(() => {
          if (!hasLoggedRecently) {
            setIsAppStarting(false);
          }
        }, 2000);

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.output) {
                  setAppLogs((prev) => prev + data.output);
                  lastLogTime = Date.now();
                  hasLoggedRecently = true;
                  setIsAppStarting(false);
                }
              } catch {
                // Not JSON, append as plain text
                setAppLogs((prev) => prev + line + "\n");
                lastLogTime = Date.now();
                hasLoggedRecently = true;
                setIsAppStarting(false);
              }
            }
          }
        }
        
        // Stream ended naturally (process exited) - mark starting as done
        setIsAppStarting(false);
      } catch (error: any) {
        if (error.name !== "AbortError" && !cancelled) {
          console.error("Log streaming error:", error);
          setAppLogs((prev) => prev + `\x1b[31mLog streaming error: ${error.message}\x1b[0m\n`);
        }
        setIsAppStarting(false);
      }
    };

    // Start streaming logs
    streamLogs();

    // Check for app readiness: if no new logs for 3 seconds and URL is alive
    const readinessInterval = window.setInterval(async () => {
      if (cancelled) return;

      const timeSinceLastLog = Date.now() - lastLogTime;
      
      // If we've had logs and then 3 seconds of silence, check if app is ready
      if (hasLoggedRecently && timeSinceLastLog > 3000 && currentProjectConfig?.url) {
        // Check if URL is responding
        try {
          const checkRes = await fetch(`/api/app-status?repo=${selectedRepo}`);
          const status = await checkRes.json();
          
          if (status.isRunning) {
            // App is ready, switch to browser view
            setIsAppStarting(false);
            setIframeUrl(currentProjectConfig.url);
            setViewMode("browser");
          }
        } catch (error) {
          console.error("Readiness check error:", error);
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(readinessInterval);
      if (startTimeoutId !== null) {
        window.clearTimeout(startTimeoutId);
      }
      if (appLogsAbortControllerRef.current) {
        appLogsAbortControllerRef.current.abort();
        appLogsAbortControllerRef.current = null;
      }
    };
  }, [logStreamPid, selectedRepo, currentProjectConfig?.url]);

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
        
        // Find the repo path directly from repositories list
        const repo = repositories.find(r => r.name === selectedRepo);
        const repoPath = repo?.path || (basePath ? joinFsPath(basePath, selectedRepo) : null);
        
        if (!repoPath) {
          console.error("Could not determine repository path");
          return;
        }

        const createdAt =
          new Date().toISOString();
        const id = `${opts.kind}-${Date.now()}`;

        const baseDir =
          opts.kind === "epic"
            ? joinFsPath(
                repoPath,
                ".agelum",
                "work",
                "epics",
                opts.state,
              )
            : opts.kind === "task"
              ? joinFsPath(
                  repoPath,
                  ".agelum",
                  "work",
                  "tasks",
                  opts.state,
                )
              : joinFsPath(
                  repoPath,
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
        repositories
      ],
    );

  const handleStartApp = React.useCallback(async () => {
    if (!selectedRepo) return;
    
    const devCommand =
      currentProjectConfig?.commands?.dev ||
      "pnpm dev";
    const repoPath = currentProjectPath || "unknown";
    
    // Show rich banner with project context
    const banner = [
      `\x1b[36m━━━ Starting: ${selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("\n");
    
    setAppLogs(banner);
    setIsAppStarting(true);
    setViewMode("logs");
    
    // Abort any existing log streaming
    if (appLogsAbortControllerRef.current) {
      appLogsAbortControllerRef.current.abort();
    }
    setLogStreamPid(null);
    
    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "start" }),
      });
      const data = await res.json();
      if (!data.success) {
        setAppLogs((prev) => prev + `\x1b[31mError: ${data.error || "Failed to start app"}\x1b[0m\n`);
        setIsAppStarting(false);
        return;
      }
      
      if (data.pid) {
        setAppPid(data.pid);
        setIsAppRunning(true);
        setIsAppManaged(true);
        setLogStreamPid(data.pid);
      } else {
        setAppLogs((prev) => prev + "\x1b[31mError: Missing process id from start response\x1b[0m\n");
        setIsAppStarting(false);
      }
    } catch (error) {
      setAppLogs((prev) => prev + `\x1b[31mError: ${error}\x1b[0m\n`);
      setIsAppStarting(false);
    }
  }, [selectedRepo, currentProject?.commands?.dev, currentProjectPath]);

  const handleStopApp = React.useCallback(async () => {
    if (!selectedRepo) return;
    
    // Abort log streaming
    if (appLogsAbortControllerRef.current) {
      appLogsAbortControllerRef.current.abort();
      appLogsAbortControllerRef.current = null;
    }
    setLogStreamPid(null);
    
    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "stop" }),
      });
      const data = await res.json();
      if (!data.success) {
        setAppLogs((prev) => prev + `\x1b[31mError stopping: ${data.error}\x1b[0m\n`);
      } else {
        setAppLogs((prev) => prev + "\x1b[33m[Stopped]\x1b[0m\n");
        setIsAppRunning(false);
        setIsAppManaged(false);
        setAppPid(null);
      }
    } catch (error) {
      setAppLogs((prev) => prev + `\x1b[31mError stopping: ${error}\x1b[0m\n`);
    }
  }, [selectedRepo]);

  const handleRestartApp = React.useCallback(async () => {
    if (!selectedRepo) return;
    
    const devCommand =
      currentProjectConfig?.commands?.dev ||
      "pnpm dev";
    const repoPath = currentProjectPath || "unknown";
    
    // Abort existing stream
    if (appLogsAbortControllerRef.current) {
      appLogsAbortControllerRef.current.abort();
    }
    setLogStreamPid(null);
    
    const banner = [
      `\x1b[36m━━━ Restarting: ${selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("\n");
    
    setAppLogs(banner);
    setIsAppStarting(true);
    setViewMode("logs");
    
    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "restart" }),
      });
      const data = await res.json();
      if (!data.success) {
        setAppLogs((prev) => prev + `\x1b[31mError: ${data.error || "Failed to restart app"}\x1b[0m\n`);
        setIsAppStarting(false);
      } else if (data.pid) {
        setAppPid(data.pid);
        setIsAppRunning(true);
        setIsAppManaged(true);
        setLogStreamPid(data.pid);
      }
    } catch (error) {
      setAppLogs((prev) => prev + `\x1b[31mError: ${error}\x1b[0m\n`);
      setIsAppStarting(false);
    }
  }, [selectedRepo, currentProject?.commands?.dev, currentProjectPath]);

  const handleInstallDeps = React.useCallback(async () => {
    if (!selectedRepo || !currentProject) return;
    const installCmd = "pnpm install";
    setTerminalToolName("Install Dependencies");
    setTerminalOutput(`Running: ${installCmd}\n`);
    setRightSidebarView("terminal");
    setIsTerminalRunning(true);

    terminalAbortControllerRef.current = new AbortController();
    const ac = terminalAbortControllerRef.current;

    try {
      const res = await fetch("/api/system/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: selectedRepo,
          command: installCmd,
        }),
        signal: ac.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setTerminalOutput((prev) => `${prev}\nError: No response body`);
        setIsTerminalRunning(false);
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
                setTerminalOutput((prev) => prev + data.output);
              }
            } catch {
              setTerminalOutput((prev) => prev + line + "\n");
            }
          }
        }
      }

      setIsTerminalRunning(false);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setTerminalOutput((prev) => `${prev}\nError: ${error.message}`);
      }
      setIsTerminalRunning(false);
    }
  }, [selectedRepo, currentProject]);

  const handleBuildApp = React.useCallback(async () => {
    if (!selectedRepo || !currentProject) return;
    const buildCmd = currentProject.commands?.build || "pnpm build";
    setTerminalToolName("Build App");
    setTerminalOutput(`Running: ${buildCmd}\n`);
    setRightSidebarView("terminal");
    setIsTerminalRunning(true);

    terminalAbortControllerRef.current = new AbortController();
    const ac = terminalAbortControllerRef.current;

    try {
      const res = await fetch("/api/system/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: selectedRepo,
          command: buildCmd,
        }),
        signal: ac.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setTerminalOutput((prev) => `${prev}\nError: No response body`);
        setIsTerminalRunning(false);
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
                setTerminalOutput((prev) => prev + data.output);
              }
            } catch {
              setTerminalOutput((prev) => prev + line + "\n");
            }
          }
        }
      }

      setIsTerminalRunning(false);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setTerminalOutput((prev) => `${prev}\nError: ${error.message}`);
      }
      setIsTerminalRunning(false);
    }
  }, [selectedRepo, currentProject]);

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
        };
        viewMode: ViewMode;
        testContext?: {
          testViewMode:
            | "steps"
            | "code"
            | "results";
          testOutput?: string;
          testStatus?:
            | "success"
            | "failure"
            | "running";
        };
        selectedRepo: string | null;
      }) => {
        const trimmed =
          opts.promptText.trim();
        if (!trimmed) return "";

        const filePath = opts.file.path;
        const normalizedPath =
          filePath.replace(/\\/g, "/");
        const isEpicDoc =
          normalizedPath.includes(
            "/.agelum/work/epics/",
          ) ||
          normalizedPath.includes(
            "/agelum/epics/",
          ) ||
          opts.viewMode === "epics";
        const isTaskDoc =
          normalizedPath.includes(
            "/.agelum/work/tasks/",
          ) ||
          normalizedPath.includes(
            "/agelum/tasks/",
          ) ||
          opts.viewMode === "kanban" ||
          opts.viewMode === "tasks";
        const isTestDoc =
          normalizedPath.includes(
            "/.agelum/work/tests/",
          ) ||
          normalizedPath.includes(
            "/agelum-test/tests/",
          ) ||
          opts.viewMode === "tests";
        const isAiDoc =
          normalizedPath.includes(
            "/.agelum/ai/",
          ) ||
          normalizedPath.includes("/ai/") ||
          opts.viewMode === "ai";

        const effectiveDocMode:
          | "modify"
          | "start" =
          isTestDoc || isAiDoc
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

        if (
          operation === "modify_test"
        ) {
          if (
            opts.testContext
              ?.testViewMode ===
              "results" &&
            opts.testContext
              ?.testStatus ===
              "failure" &&
            opts.testContext?.testOutput
          ) {
            const formattedOutput =
              formatTestOutputForPrompt(
                opts.testContext
                  .testOutput,
              );
            return [
              `Fix the failing Stagehand test file at "${filePath}".`,
              "",
              "Failure logs from the last execution:",
              "```",
              formattedOutput,
              "```",
              "",
              "User instructions:",
              trimmed,
              "",
              "Rules:",
              "- Only modify the specified file with Stagehand test code. Request confirmation before making any other modifications.",
            ].join("\n");
          }
          return [
            `Modify the test file at "${filePath}" with these user instructions:`,
            trimmed,
            "",
            "Rules:",
            "- Only modify the specified file with Stagehand test code. Request confirmation before making any other modifications.",
          ].join("\n");
        }

        if (
          operation ===
          "modify_document"
        ) {
          return [
            `Modify the file at "${filePath}" with these user instructions:`,
            trimmed,
            "",
            "Rules:",
            "- Locate/open the file by path (do not expect its contents in this prompt).",
            "- Apply changes directly to that file.",
            "- If you create new files, use valid filenames and place them in the correct directories.",
          ].join("\n");
        }

        if (
          operation ===
          "create_tasks_from_epic"
        ) {
          return [
            `Create task files from the epic document at "${filePath}".`,
            "",
            "User instructions:",
            trimmed,
            "",
            "What to do:",
            "- Read the epic document and extract its goal and acceptance criteria.",
            "- Propose a set of tasks that together satisfy the epic acceptance criteria.",
            "- For each proposed task, include: title, story points, priority (two digits), short description, and the proposed file path.",
            "- Ask for confirmation before creating any task files.",
            "",
            "Where to create task files:",
            `- Prefer ".agelum/work/tasks/pending/<EPIC TITLE>/" if the repo uses ".agelum".`,
            `- Otherwise use "agelum/tasks/pending/<EPIC TITLE>/" (legacy structure).`,
            "",
            "Task file naming convention:",
            '- "<PRIORITY> <TASK TITLE> (<STORY_POINTS>).md" (example: "01 Design new hero section (3).md").',
            "",
            "Task file format:",
            "---",
            "title: <Task title>",
            "created: <ISO timestamp>",
            "type: task",
            "state: pending",
            "priority: <two digits>",
            "storyPoints: <number>",
            "epic: <Epic title>",
            "---",
            "",
            "# <Task title>",
            "",
            "<Task description>",
            "",
            "## Acceptance Criteria",
            "- [ ] ...",
          ].join("\n");
        }

        if (
          operation === "work_on_task"
        ) {
          return [
            `Use the task document at "${filePath}" as the source of requirements and acceptance criteria.`,
            "",
            "User instructions:",
            trimmed,
            "",
            "Rules:",
            "- Locate/open the file by path (do not expect its contents in this prompt).",
            "- Make the necessary repository changes to complete the task.",
          ].join("\n");
        }

        return [
          `Start work using "${filePath}" as context.`,
          "",
          "User instructions:",
          trimmed,
          "",
          "Rules:",
          "- Locate/open the file by path (do not expect its contents in this prompt).",
        ].join("\n");
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

  const handleCopyFullPrompt =
    React.useCallback(() => {
      if (!selectedFile) return;
      const prompt = buildToolPrompt({
        promptText: promptText,
        mode: promptMode,
        docMode: docAiMode,
        file: {
          path: selectedFile.path,
        },
        viewMode,
        testContext:
          viewMode === "tests"
            ? {
                testViewMode,
                testOutput,
                testStatus:
                  inferTestExecutionStatus(
                    testOutput,
                    isTestRunning,
                  ),
              }
            : undefined,
        selectedRepo,
      });

      // Replace @mentions with full paths
      let finalPrompt = prompt;
      Object.entries(fileMap).forEach(
        ([name, path]) => {
          finalPrompt = finalPrompt
            .split(`@${name}`)
            .join(path);
        },
      );

      navigator.clipboard.writeText(
        finalPrompt,
      );
    }, [
      selectedFile,
      promptText,
      promptMode,
      docAiMode,
      viewMode,
      selectedRepo,
      buildToolPrompt,
      fileMap,
      testViewMode,
      testOutput,
      isTestRunning,
    ]);

  const handleRecordAudio =
    React.useCallback(() => {
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
        return;
      }

      const SpeechRecognition =
        (window as any)
          .SpeechRecognition ||
        (window as any)
          .webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert(
          "Speech recognition not supported in this browser.",
        );
        return;
      }

      const recognition =
        new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (
        event: any,
      ) => {
        let finalTranscript = "";

        for (
          let i = event.resultIndex;
          i < event.results.length;
          ++i
        ) {
          if (
            event.results[i].isFinal
          ) {
            finalTranscript +=
              event.results[i][0]
                .transcript;
          }
        }

        if (finalTranscript) {
          setPromptText((prev) =>
            prev
              ? `${prev} ${finalTranscript}`
              : finalTranscript,
          );
        }
      };

      recognition.onstart = () =>
        setIsRecording(true);
      recognition.onend = () =>
        setIsRecording(false);
      recognition.onerror = (
        event: any,
      ) => {
        console.error(
          "Speech recognition error:",
          event.error,
        );
        setIsRecording(false);
      };

      recognitionRef.current =
        recognition;
      recognition.start();
    }, [isRecording, setPromptText]);

  const handleFileUpload =
    React.useCallback(
      async (
        e: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const file =
          e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch(
            "/api/upload",
            {
              method: "POST",
              body: formData,
            },
          );
          const data = await res.json();
          if (data.path) {
            setPromptText((prev) =>
              prev
                ? `${prev}\n![${data.name}](${data.path})`
                : `![${data.name}](${data.path})`,
            );
          }
        } catch (error) {
          console.error(
            "Upload failed:",
            error,
          );
        }
      },
      [setPromptText],
    );

  const fetchFiles =
    React.useCallback(async () => {
      if (!selectedRepo) return;
      try {
        const res = await fetch(
          `/api/files?repo=${selectedRepo}`,
        );
        const data = await res.json();

        const flatten = (
          nodes: any[],
        ): any[] => {
          return nodes.reduce(
            (acc, node) => {
              if (
                node.type === "file"
              ) {
                acc.push({
                  name: node.name,
                  path: node.path,
                });
              } else if (
                node.children
              ) {
                acc.push(
                  ...flatten(
                    node.children,
                  ),
                );
              }
              return acc;
            },
            [],
          );
        };

        if (data.tree?.children) {
          setAllFiles(
            flatten(data.tree.children),
          );
        }
      } catch (error) {
        console.error(
          "Failed to fetch files:",
          error,
        );
      }
    }, [selectedRepo]);

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

      const rawPrompt = buildToolPrompt(
        {
          promptText: trimmedPrompt,
          mode: promptMode,
          docMode: docAiMode,
          file: {
            path: selectedFile.path,
          },
          viewMode,
          testContext:
            viewMode === "tests"
              ? {
                  testViewMode,
                  testOutput,
                  testStatus:
                    inferTestExecutionStatus(
                      testOutput,
                      isTestRunning,
                    ),
                }
              : undefined,
          selectedRepo,
        },
      );

      // Replace @mentions with full paths
      let prompt = rawPrompt;
      Object.entries(fileMap).forEach(
        ([name, path]) => {
          prompt = prompt
            .split(`@${name}`)
            .join(path);
        },
      );

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
      basePath,
      selectedRepo,
      viewMode,
      fileMap,
      testViewMode,
      testOutput,
      isTestRunning,
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
    setTestViewMode("results");

    let fullOutput = "";
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

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } =
          await reader.read();
        if (done) break;
        const text =
          decoder.decode(value);
        fullOutput += text;
        setTestOutput(
          (prev) => prev + text,
        );
      }
    } catch (error) {
      fullOutput +=
        "\nError running test";
      setTestOutput(
        (prev) =>
          prev + "\nError running test",
      );
    } finally {
      setIsTestRunning(false);
      const status =
        inferTestExecutionStatus(
          fullOutput,
          false,
        );
      if (status === "failure") {
        setPromptDrafts((prev) => {
          const key = "tests:results";
          if (prev[key]?.trim())
            return prev;
          return {
            ...prev,
            [key]: `Fix the error in "${path}" so the test passes.`,
          };
        });
      }
    }
  };

  const handleSaveFile = React.useCallback(
    async (opts: {
      path: string;
      content: string;
    }) => {
      const res = await fetch(
        "/api/file",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path: opts.path,
            content: opts.content,
          }),
        },
      );

      if (!res.ok) {
        throw new Error(
          "Failed to save file",
        );
      }

      setSelectedFile((prev) =>
        prev
          ? {
              ...prev,
              content: opts.content,
            }
          : null,
      );
    },
    [],
  );

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
      <div className="flex w-full h-full">
        <div className="flex overflow-hidden flex-1 border-r border-border">
          <FileViewer
            file={selectedFile}
            onSave={handleSaveFile}
            onFileSaved={loadFileTree}
            editing={workEditorEditing}
            onEditingChange={
              setWorkEditorEditing
            }
            onBack={opts.onBack}
            onRename={opts.onRename}
            isTestFile={
              viewMode === "tests"
            }
            testViewMode={testViewMode}
            onTestViewModeChange={
              setTestViewMode
            }
            testOutput={testOutput}
            isTestRunning={
              isTestRunning
            }
          />
        </div>
        <div
          className={`flex overflow-hidden flex-col bg-background border-l border-border transition-all duration-300 ${
            (rightSidebarView ===
              "terminal" &&
              isTerminalRunning) ||
            rightSidebarView ===
              "iframe"
              ? "w-[50%]"
              : "w-[360px]"
          }`}
        >
          {/* Terminal View */}
          <div
            className={`flex overflow-hidden flex-col flex-1 h-full ${
              rightSidebarView ===
              "terminal"
                ? ""
                : "hidden"
            }`}
          >
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
                <div className="flex justify-center items-center h-full text-xs text-muted-foreground">
                  No terminal output
                </div>
              )}
            </div>
            <div className="flex gap-2 p-2 border-t border-border">
              {isTerminalRunning && (
                <button
                  onClick={() =>
                    cancelTerminal()
                  }
                  className="flex-1 px-3 py-2 text-sm text-white rounded border border-red-800 transition-colors bg-red-900/50 hover:bg-red-900"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() =>
                  setRightSidebarView(
                    "prompt",
                  )
                }
                className="flex-1 px-3 py-2 text-sm text-white rounded border transition-colors bg-secondary border-border hover:bg-accent"
              >
                {isTerminalRunning
                  ? "Return to Prompt"
                  : "Back to Prompt"}
              </button>
            </div>
          </div>

          {/* Iframe / OpenCode Web View */}
          <div
            className={`flex overflow-hidden flex-col flex-1 h-full ${
              rightSidebarView ===
              "iframe"
                ? ""
                : "hidden"
            }`}
          >
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
                        () => undefined,
                      );
                    }
                  }}
                />
              ) : (
                <div className="flex justify-center items-center h-full text-xs text-muted-foreground">
                  {openCodeWebError ||
                    "No URL loaded"}
                </div>
              )}

              {isOpenCodeWebLoading && (
                <div className="flex absolute inset-0 flex-col gap-3 justify-center items-center bg-black">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin border-muted-foreground border-t-transparent" />
                  <div className="text-xs text-muted-foreground">
                    {openCodeWebLoadingLabel ||
                      "Loading…"}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-2 border-t border-border">
              <button
                onClick={() =>
                  setRightSidebarView(
                    "prompt",
                  )
                }
                className="px-3 py-2 w-full text-sm text-white rounded border transition-colors bg-secondary border-border hover:bg-accent"
              >
                Return to Prompt
              </button>
            </div>
          </div>

          {/* Prompt View */}
          <div
            className={`flex overflow-hidden flex-col flex-1 ${
              rightSidebarView ===
              "prompt"
                ? ""
                : "hidden"
            }`}
          >
            <div className="flex gap-2 p-3 border-b border-border">
              {viewMode === "tests" ? (
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
                  className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-foreground"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isTestRunning
                    ? "Running…"
                    : "Run test"}
                </button>
              ) : (
                !workDocIsDraft &&
                viewMode !== "ai" && (
                  <div className="flex flex-1 p-1 rounded-lg border border-border bg-background">
                    <button
                      onClick={() =>
                        setDocAiMode(
                          "modify",
                        )
                      }
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                        docAiMode ===
                        "modify"
                          ? "bg-secondary text-white shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
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
                          ? "bg-secondary text-white shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
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
                      selectedFile?.path
                        ?.replace(
                          /\\/g,
                          "/",
                        )
                        .includes(
                          "/agelum/epics/",
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
                  className="pr-6 w-full h-full text-xs text-right bg-transparent appearance-none cursor-pointer outline-none text-muted-foreground hover:text-foreground"
                >
                  <option
                    value="agent"
                    className="text-right bg-secondary"
                  >
                    Agent
                  </option>
                  <option
                    value="plan"
                    className="text-right bg-secondary"
                  >
                    Plan
                  </option>
                  <option
                    value="chat"
                    className="text-right bg-secondary"
                  >
                    Chat
                  </option>
                </select>
                <ChevronDown className="absolute right-0 top-1/2 w-4 h-4 -translate-y-1/2 pointer-events-none text-muted-foreground" />
              </div>
            </div>

            <div className="p-3 border-b border-border">
              <div className="flex overflow-hidden relative flex-col w-full rounded-xl border transition-all bg-secondary border-border focus-within:ring-2 focus-within:ring-blue-600/50">
                <textarea
                  value={promptText}
                  onChange={(e) => {
                    const val =
                      e.target.value;
                    setPromptText(val);
                    if (
                      val.endsWith("@")
                    ) {
                      setFilePickerOpen(
                        true,
                      );
                      void fetchFiles();
                    }
                  }}
                  className="px-3 py-2 w-full h-32 text-sm bg-transparent resize-none text-foreground focus:outline-none"
                  placeholder="Write a prompt…"
                />

                {filePickerOpen && (
                  <div className="overflow-auto absolute left-3 bottom-12 z-10 w-64 max-h-48 rounded-lg border shadow-xl bg-background border-border">
                    <div className="flex sticky top-0 gap-2 items-center p-2 border-b bg-background border-border">
                      <Search className="w-3 h-3 text-muted-foreground" />
                      <input
                        autoFocus
                        value={
                          fileSearch
                        }
                        onChange={(e) =>
                          setFileSearch(
                            e.target
                              .value,
                          )
                        }
                        placeholder="Search files..."
                        className="flex-1 text-xs bg-transparent outline-none"
                      />
                      <button
                        onClick={() =>
                          setFilePickerOpen(
                            false,
                          )
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {allFiles
                      .filter((f) =>
                        f.name
                          .toLowerCase()
                          .includes(
                            fileSearch.toLowerCase(),
                          ),
                      )
                      .map((f) => (
                        <button
                          key={f.path}
                          onClick={() => {
                            setPromptText(
                              (
                                prev,
                              ) => {
                                const lastAt =
                                  prev.lastIndexOf(
                                    "@",
                                  );
                                return (
                                  prev.substring(
                                    0,
                                    lastAt +
                                      1,
                                  ) +
                                  f.name +
                                  " "
                                );
                              },
                            );
                            setFileMap(
                              (
                                prev,
                              ) => ({
                                ...prev,
                                [f.name]:
                                  f.path,
                              }),
                            );
                            setFilePickerOpen(
                              false,
                            );
                            setFileSearch(
                              "",
                            );
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-secondary truncate"
                        >
                          {f.name}
                        </button>
                      ))}
                  </div>
                )}

                <div className="flex justify-between items-center px-3 py-2 border-t border-border/50 bg-secondary/30">
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => {
                        setFilePickerOpen(
                          true,
                        );
                        void fetchFiles();
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
                      title="Add file"
                    >
                      <AtSign className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
                      title="Add image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={
                        handleFileUpload
                      }
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={
                        handleRecordAudio
                      }
                      className={`p-1.5 rounded-md transition-colors ${
                        isRecording
                          ? "text-red-500 bg-red-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-background"
                      }`}
                      title="Record audio"
                    >
                      <Mic
                        className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`}
                      />
                    </button>
                    <button
                      onClick={
                        handleCopyFullPrompt
                      }
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
                      title="Copy full prompt"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex overflow-auto flex-col flex-1">
              <div className="p-3 border-b border-border">
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
                      const isActive =
                        isTerminalRunning &&
                        terminalToolName ===
                          tool.name;

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
                              ? isActive
                                ? "border-blue-600/50 bg-blue-900/10 shadow-lg"
                                : "border-border bg-secondary hover:border-muted-foreground shadow-sm"
                              : "border-border bg-background opacity-50"
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (
                                isActive
                              ) {
                                setRightSidebarView(
                                  "terminal",
                                );
                              } else {
                                runTool(
                                  tool.name,
                                );
                              }
                            }}
                            disabled={
                              !tool.available ||
                              (!isActive &&
                                !promptText.trim())
                            }
                            className="flex-1 px-3 py-3 text-left group disabled:opacity-50"
                          >
                            <div className="flex gap-2 items-center mb-0.5">
                              <div className="text-sm font-medium text-foreground group-hover:text-white">
                                {
                                  tool.displayName
                                }
                              </div>
                              {isActive && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {isActive
                                ? "Continue working"
                                : "Click to run"}
                            </div>
                          </button>

                          <div className="p-1 border-t bg-background border-border">
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
                              className="w-full bg-transparent text-[10px] text-muted-foreground focus:text-foreground outline-none cursor-pointer py-0.5 px-1 rounded hover:bg-secondary"
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
                  {(() => {
                    const isOpenCodeActive =
                      isOpenCodeWebLoading ||
                      iframeUrl;
                    return (
                      <div
                        className={`flex overflow-hidden flex-col w-full rounded-lg border shadow-sm transition-all ${
                          isOpenCodeActive
                            ? "shadow-lg border-blue-600/50 bg-blue-900/10"
                            : "border-border bg-secondary hover:border-muted-foreground"
                        }`}
                      >
                        <button
                          onClick={async () => {
                            if (
                              isOpenCodeActive
                            ) {
                              setRightSidebarView(
                                "iframe",
                              );
                              return;
                            }
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
                                        file: {
                                          path: selectedFile!
                                            .path,
                                        },
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
                          <div className="flex gap-2 items-center mb-0.5">
                            <div className="text-sm font-medium text-foreground group-hover:text-white">
                              OpenCode
                              Web
                            </div>
                            {isOpenCodeActive && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {isOpenCodeWebLoading
                              ? "Opening…"
                              : isOpenCodeActive
                                ? "Continue working"
                                : "Click to open"}
                          </div>
                        </button>
                        <div className="p-1 border-t bg-background border-border">
                          <div className="w-full text-[10px] text-muted-foreground py-0.5 px-1">
                            Web
                            Interface
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center px-4 py-2 border-b bg-secondary border-border">
        <div className="flex gap-6 items-center">
          <AgelumNotesLogo size="sm" />

          <div className="flex gap-1 items-center">
            {visibleItems.map(
              (mode, index) => {
                if (
                  mode === "separator"
                ) {
                  return (
                    <div
                      key={`sep-${index}`}
                      className="w-px h-6 bg-border mx-1"
                    />
                  );
                }
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
                    key={`${mode}-${index}`}
                    onClick={() => {
                      setViewMode(
                        mode as ViewMode,
                      );
                      if (mode === "ai") {
                        setDocAiMode("modify");
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors outline-none focus:outline-none ring-0 ${
                      viewMode === mode
                        ? "text-amber-500 bg-amber-500/10"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex items-center rounded-full px-1.5 py-1 shadow-sm">
            <ProjectSelector
              repositories={repositories}
              selectedRepo={selectedRepo}
              onSelect={(repoName) => setSelectedRepo(repoName)}
              className=""
            />

            <div className="mx-1.5 w-px h-4 bg-border" />

            <div className="flex items-center gap-0.5">
              {!isAppRunning ? (
                <button
                  onClick={handleStartApp}
                  className="p-1.5 rounded-full text-green-400 hover:bg-green-400/10 transition-colors"
                  title="Start App"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleStopApp}
                  className="p-1.5 rounded-full text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Stop App"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}

              {isAppRunning && isAppManaged && (
                <button
                  onClick={() => {
                    setRightSidebarView("terminal");
                    setTerminalToolName("App Logs");
                  }}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-accent transition-colors"
                  title="View Logs"
                >
                  <ScrollText className="w-4 h-4" />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() =>
                    setIsAppActionsMenuOpen(!isAppActionsMenuOpen)
                  }
                  className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-accent transition-colors"
                  title="More Actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isAppActionsMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-1 py-1 bg-secondary border border-border rounded-lg shadow-lg min-w-[160px] z-50"
                    onMouseLeave={() => setIsAppActionsMenuOpen(false)}
                  >
                    {isAppRunning && (
                      <button
                        onClick={() => {
                          handleRestartApp();
                          setIsAppActionsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                      >
                        <RotateCw className="w-4 h-4" />
                        Restart
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleInstallDeps();
                        setIsAppActionsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </button>
                    <button
                      onClick={() => {
                        handleBuildApp();
                        setIsAppActionsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Hammer className="w-4 h-4" />
                      Build
                    </button>
                    <div className="my-1 mx-2 h-px bg-border" />
                    <button
                      onClick={() => {
                        setSettingsTab("project-config");
                        setIsSettingsOpen(true);
                        setIsAppActionsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSettingsTab("project-config");
                  setIsSettingsOpen(true);
                }}
                className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-accent transition-colors"
                title="Project Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setSettingsTab(
                "defaults",
              );
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-white hover:bg-accent"
            title="General Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-white hover:bg-accent rounded-lg text-sm transition-colors">
            <LogIn className="w-4 h-4" />
            Login
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden flex-col flex-1">
        <div className="flex overflow-hidden flex-1">
          {[
            "docs",
            "ai",
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
                viewMode={viewMode}
              />
              {viewMode === "tests" ? (
                <div className="flex overflow-hidden flex-col flex-1 min-h-0">
                  {testsSetupStatus &&
                  testsSetupStatus.state !==
                    "ready" ? (
                    <div
                      className={`bg-secondary border-b border-border min-h-0 ${
                        isSetupLogsVisible
                          ? "flex overflow-hidden flex-col flex-1"
                          : ""
                      }`}
                    >
                      <div className="flex flex-shrink-0 justify-between items-center px-3 py-2">
                        <div className="text-sm text-muted-foreground">
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
                          className="px-2 py-1 text-xs rounded transition-colors text-foreground hover:text-white hover:bg-accent"
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
                            className="overflow-auto flex-1 p-3 min-h-0 font-mono text-xs whitespace-pre-wrap bg-black rounded text-foreground"
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
                            const newPath =
                              ext &&
                              newTitle
                                .toLowerCase()
                                .endsWith(
                                  `.${ext.toLowerCase()}`,
                                )
                                ? `${dir}/${newTitle}`
                                : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;

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
                <div className="flex overflow-hidden flex-1 bg-background">
                  {selectedFile ? (
                    renderWorkEditor({
                      onBack: () =>
                        setSelectedFile(
                          null,
                        ),
                      onRename: async (
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
                            .split("/")
                            .slice(
                              0,
                              -1,
                            )
                            .join("/");
                        const fileName =
                          oldPath
                            .split("/")
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
                        const newPath =
                          ext &&
                          newTitle
                            .toLowerCase()
                            .endsWith(
                              `.${ext.toLowerCase()}`,
                            )
                            ? `${dir}/${newTitle}`
                            : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;

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
                      },
                    })
                  ) : (
                    <div className="flex flex-1 justify-center items-center text-muted-foreground">
                      Select a file to
                      view and edit
                    </div>
                  )}
                </div>
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
          ) : viewMode === "review" ? (
            <div className="flex flex-1 overflow-hidden bg-background">
              <FileBrowser
                fileTree={fileTree}
                onFileSelect={(node) =>
                  setSelectedFile({
                    path: node.path,
                    content: node.content || "",
                  })
                }
                currentPath={currentPath}
                basePath={basePath}
                onRefresh={loadFileTree}
              />
              {selectedFile ? (
                <div className="flex relative flex-1 min-w-0">
                  <FileViewer
                    file={selectedFile}
                    onSave={async ({ content }) => {
                      const res = await fetch(
                        "/api/files",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify({
                            repo: selectedRepo,
                            path: selectedFile.path,
                            content,
                          }),
                        },
                      );
                      if (!res.ok)
                        throw new Error(
                          "Failed to save file",
                        );
                      setSelectedFile({
                        ...selectedFile,
                        content,
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-1 justify-center items-center text-muted-foreground">
                  Select a file to view and edit
                </div>
              )}
            </div>
          ) : viewMode === "logs" ? (
            <div className="flex flex-1 overflow-hidden flex-col bg-background">
              <div className="flex-1 min-h-0 bg-black">
                <TerminalViewer
                  output={appLogs || (isAppStarting ? "Starting application...\n" : "")}
                  className="w-full h-full"
                  onInput={(data) => {
                    // Send input to the app process if needed
                    if (appPid && isAppRunning) {
                      fetch("/api/app-logs", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pid: appPid, input: data }),
                      }).catch((error) => {
                        console.error("Failed to send input:", error);
                      });
                    }
                  }}
                />
              </div>
            </div>
          ) : viewMode === "browser" ? (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 bg-background overflow-hidden relative flex-col border-r border-border">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
                  <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded px-3 py-1 group">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={iframeUrl}
                      onChange={(e) => setIframeUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          // Force reload or something if needed
                          const target = e.currentTarget;
                          const val = target.value;
                          setIframeUrl("");
                          setTimeout(() => setIframeUrl(val), 0);
                        }
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground focus:text-foreground transition-colors"
                      placeholder="Enter URL..."
                    />
                  </div>
                </div>
                {iframeUrl ? (
                  <iframe 
                    src={iframeUrl} 
                    ref={browserIframeRef}
                    className="flex-1 w-full border-none bg-white"
                    title="App Browser"
                    allow="camera; microphone; display-capture" // Enable display-capture for getDisplayMedia if supported in iframe
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Enter a URL to preview the application
                  </div>
                )}
              </div>
              <BrowserRightPanel 
                repo={selectedRepo || ""} 
                onRequestCapture={
                  requestEmbeddedCapture
                }
                projectPath={
                  selectedRepo
                    ? repositories.find(
                        (r) =>
                          r.name === selectedRepo,
                      )?.path
                    : undefined
                }
                iframeRef={browserIframeRef}
                onTaskCreated={() => {
                   // Optional: toast or feedback could be added here
                }}
              />
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
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSave={handleSettingsSave}
        initialTab={settingsTab}
        projectName={
          settingsTab === "project-config" ||
          settingsTab === "project-commands" ||
          settingsTab === "project-preview"
            ? selectedRepo || undefined
            : undefined
        }
        projectPath={
          (settingsTab === "project-config" ||
           settingsTab === "project-commands" ||
           settingsTab === "project-preview") && selectedRepo
            ? repositories.find((r) => r.name === selectedRepo)?.path
            : undefined
        }
      />
    </div>
  );
}
