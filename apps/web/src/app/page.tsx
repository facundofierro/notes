"use client";

import * as React from "react";
import FileViewer from "@/components/FileViewer";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ProjectSelector } from "@/components/ProjectSelector";
import { AgelumNotesLogo } from "@agelum/shadcn";
import { IdeasTab } from "@/components/tabs/IdeasTab";
import { DocsTab } from "@/components/tabs/DocsTab";
import { EpicsTab } from "@/components/tabs/EpicsTab";
import { TasksTab } from "@/components/tabs/TasksTab";
import { TestsTab } from "@/components/tabs/TestsTab";
import { ReviewTab } from "@/components/tabs/ReviewTab";
import { AITab } from "@/components/tabs/AITab";
import { LogsTab } from "@/components/tabs/LogsTab";
import { BrowserTab } from "@/components/tabs/BrowserTab";
import {
  Terminal,
  Play,
  Square,
  ScrollText,
  AtSign,
  Image as ImageIcon,
  Mic,
  Copy,
  Search,
  X,
  MoreVertical,
  RotateCw,
  Download,
  Hammer,
  Settings,
  Settings2,
  LogIn,
  ChevronDown,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/use-settings";
import { VIEW_MODE_CONFIG, ViewMode } from "@/lib/view-config";
import { useHomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";

const TerminalViewer = dynamic(
  () => import("@/components/TerminalViewer").then((mod) => mod.TerminalViewer),
  { ssr: false }
);

export default function Home() {
  const { settings } = useSettings();
  const state = useHomeState();
  const callbacks = useHomeCallbacks(state);

  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    currentPath,
    fileTree,
    selectedFile,
    setSelectedFile,
    basePath,
    viewMode,
    setViewMode,
    testViewMode,
    setTestViewMode,
    testOutput,
    isTestRunning,
    testsSetupStatus,
    isSetupLogsVisible,
    setIsSetupLogsVisible,
    workEditorEditing,
    setWorkEditorEditing,
    agentTools,
    rightSidebarView,
    setRightSidebarView,
    iframeUrl,
    setIframeUrl,
    projectConfig,
    setProjectConfig,
    isRecording,
    filePickerOpen,
    setFilePickerOpen,
    fileSearch,
    setFileSearch,
    allFiles,
    fileMap,
    setFileMap,
    isOpenCodeWebLoading,
    setIsOpenCodeWebLoading,
    openCodeWebLoadingLabel,
    setOpenCodeWebLoadingLabel,
    openCodeWebError,
    setOpenCodeWebError,
    pendingOpenCodeWebMessage,
    setPendingOpenCodeWebMessage,
    workDocIsDraft,
    setWorkDocIsDraft,
    promptMode,
    setPromptMode,
    docAiMode,
    setDocAiMode,
    toolModelsByTool,
    toolModelByTool,
    setToolModelByTool,
    terminalToolName,
    terminalOutput,
    isTerminalRunning,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsTab,
    setSettingsTab,
    isAppRunning,
    setIsAppRunning,
    isAppManaged,
    setIsAppManaged,
    appPid,
    setAppPid,
    isAppActionsMenuOpen,
    setIsAppActionsMenuOpen,
    appLogs,
    setAppLogs,
    isAppStarting,
    setIsAppStarting,
    logStreamPid,
    currentProjectPath,
    currentProjectConfig,
    isElectron,
    setIsElectron,
    appLogsAbortControllerRef,
    isScreenshotMode,
    setIsScreenshotMode,
  } = state;

  const {
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
    terminalAbortControllerRef,
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
  } = callbacks;

  const browserViewPlaceholderRef = React.useRef<HTMLDivElement>(null);

  // Detect Electron environment on mount
  React.useEffect(() => {
    setIsElectron(!!window.electronAPI?.browserView);
  }, [setIsElectron]);

  // Sync WebContentsView bounds with placeholder div
  React.useEffect(() => {
    if (
      !isElectron ||
      viewMode !== "browser" ||
      !browserViewPlaceholderRef.current
    )
      return;

    const el = browserViewPlaceholderRef.current;
    const api = window.electronAPI!.browserView;

    const syncBounds = () => {
      const rect = el.getBoundingClientRect();
      api.setBounds({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    const ro = new ResizeObserver(syncBounds);
    ro.observe(el);
    // Also sync on window resize (scroll position changes, etc.)
    window.addEventListener("resize", syncBounds);
    // Initial sync
    syncBounds();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncBounds);
    };
  }, [isElectron, viewMode]);

  // Show/hide WebContentsView when switching view modes
  React.useEffect(() => {
    if (!isElectron) return;
    const api = window.electronAPI!.browserView;
    if (viewMode === "browser") {
      api.show();
    } else {
      api.hide();
    }
  }, [isElectron, viewMode]);

  // Track the last URL loaded into the WebContentsView to avoid re-loading on navigation feedback
  const electronLoadedUrlRef = React.useRef<string>("");

  // Load URL in the Electron WebContentsView when iframeUrl changes
  React.useEffect(() => {
    if (!isElectron || !iframeUrl) return;
    if (iframeUrl === electronLoadedUrlRef.current) return;
    electronLoadedUrlRef.current = iframeUrl;
    window.electronAPI!.browserView.loadUrl(iframeUrl);
  }, [isElectron, iframeUrl]);

  // Listen for navigation events from WebContentsView
  React.useEffect(() => {
    if (!isElectron) return;
    const api = window.electronAPI!.browserView;
    const unsubNav = api.onNavigated((url) => {
      electronLoadedUrlRef.current = url;
      setIframeUrl(url);
    });
    return () => {
      unsubNav();
    };
  }, [isElectron, setIframeUrl]);

  const visibleItems = React.useMemo(() => {
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

    if (!selectedRepo || !settings.projects) {
      return defaultItems;
    }
    const project = settings.projects.find((p) => p.name === selectedRepo);

    const workflowId = project?.workflowId || settings.defaultWorkflowId;

    if (!workflowId) {
      return defaultItems;
    }

    const workflow = settings.workflows?.find((w) => w.id === workflowId);
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
        const tools = (data.tools || []) as Array<{ name: string; displayName: string; available: boolean }>;
        state.setAgentTools(tools);
      })
      .catch(() => {
        if (cancelled) return;
        state.setAgentTools([]);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  React.useEffect(() => {
    if (!selectedRepo) return;
    window.localStorage.setItem("agelum.selectedRepo", selectedRepo);
  }, [selectedRepo]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  React.useEffect(() => {
    setSelectedFile(null);
  }, [viewMode, selectedRepo, setSelectedFile]);

  // Clear log streaming when repo changes
  React.useEffect(() => {
    state.setLogStreamPid(null);
    state.setAppLogs("");
  }, [selectedRepo, state]);

  React.useEffect(() => {
    if (viewMode === "ai") {
      setDocAiMode("modify");
    }
  }, [viewMode, setDocAiMode]);

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
  }, [currentProjectPath, setProjectConfig]);

  // Sync iframeUrl with project url (only for browser view, not OpenCode)
  // Preserve the iframe URL when switching away from browser view
  const isEnteringBrowserView = React.useRef(false);
  const [preservedIframeUrl, setPreservedIframeUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (viewMode === "browser" && !isEnteringBrowserView.current) {
      // When entering browser view for the first time, restore the preserved URL or load from config
      isEnteringBrowserView.current = true;
      if (preservedIframeUrl) {
        setIframeUrl(preservedIframeUrl);
      } else if (currentProjectConfig?.url) {
        setIframeUrl(currentProjectConfig.url);
        setPreservedIframeUrl(currentProjectConfig.url);
      } else {
        setIframeUrl("");
      }
    } else if (viewMode !== "browser") {
      // When leaving browser view, preserve the current URL and reset the entry flag
      setPreservedIframeUrl((prev) => iframeUrl || prev);
      isEnteringBrowserView.current = false;
    }
  }, [viewMode, iframeUrl, preservedIframeUrl, currentProjectConfig?.url, setIframeUrl]);

  // Poll app status
  React.useEffect(() => {
    if (!selectedRepo || !currentProjectConfig?.url) {
      setIsAppRunning(false);
      setIsAppManaged(false);
      setAppPid(null);
      return;
    }

    let cancelled = false;

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
  }, [selectedRepo, currentProjectConfig?.url, isAppRunning, isAppManaged, appPid, setIsAppRunning, setIsAppManaged, setAppPid]);

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
                  if (!currentProjectConfig?.url) {
                    setIsAppStarting(false);
                  }
                }
              } catch {
                // Not JSON, append as plain text
                setAppLogs((prev) => prev + line + "\n");
                lastLogTime = Date.now();
                hasLoggedRecently = true;
                if (!currentProjectConfig?.url) {
                  setIsAppStarting(false);
                }
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

    // Check for app readiness: if URL is alive, switch to browser view
    const readinessInterval = window.setInterval(async () => {
      if (cancelled) return;

      // Only check if we are actually starting an app that has a URL
      if (isAppStarting && currentProjectConfig?.url) {
        try {
          const checkRes = await fetch(`/api/app-status?repo=${selectedRepo}`);
          const status = await checkRes.json();

          if (status.isUrlReady) {
            // App is officially ready and responding at the URL
            setIsAppStarting(false);
            setIframeUrl(currentProjectConfig.url);
            setViewMode("browser");
          }
        } catch (error) {
          console.error("Readiness check error:", error);
        }
      }
    }, 2000);

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
  }, [logStreamPid, selectedRepo, currentProjectConfig?.url, isAppStarting, setAppLogs, setIsAppStarting, setIframeUrl, setViewMode, appLogsAbortControllerRef]);

  React.useEffect(() => {
    if (viewMode !== "tests") return;
    if (!selectedRepo) return;
    const setupState = testsSetupStatus?.state;
    if (!setupState) return;
    if (setupState === "ready" || setupState === "error") return;

    let cancelled = false;
    let intervalId: number | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tests/status?repo=${selectedRepo}`);
        const data = (await res.json()) as {
          status: any;
        };
        if (cancelled) return;
        state.setTestsSetupStatus(data.status);

        if (!data.status) {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }

        if (data.status.state === "ready" || data.status.state === "error") {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        }

        if (data.status.state === "ready" && !data.status.error) return;
        setIsSetupLogsVisible(true);
      } catch {
        if (cancelled) return;
        state.setTestsSetupStatus(null);
      }
    };

    intervalId = window.setInterval(poll, 1500);
    poll();

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [selectedRepo, viewMode, testsSetupStatus?.state, state, setIsSetupLogsVisible]);

  const renderWorkEditor = (opts: {
    onBack: () => void;
    onRename?: (newTitle: string) => Promise<{ path: string; content: string } | void>;
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
            onEditingChange={setWorkEditorEditing}
            onBack={opts.onBack}
            onRename={opts.onRename}
            isTestFile={
              viewMode === "tests"
            }
            testViewMode={testViewMode}
            onTestViewModeChange={setTestViewMode}
            testOutput={testOutput}
            isTestRunning={
              isTestRunning
            }
          />
        </div>
        <div
          className={`flex overflow-hidden flex-col bg-background border-l border-border transition-all duration-300 ${ (rightSidebarView === "terminal" && isTerminalRunning) || rightSidebarView === "iframe" ? "w-[50%]" : "w-[360px]" }`}
        >
          {/* Terminal View */}
          <div
            className={`flex overflow-hidden flex-col flex-1 h-full ${ rightSidebarView === "terminal" ? "" : "hidden" }`}
          >
            <div className="flex-1 min-h-0 bg-black">
              {terminalOutput || isTerminalRunning ? (
                <TerminalViewer
                  output={
                    terminalOutput || (isTerminalRunning ? "Initializing..." : "")
                  }
                  className="w-full h-full"
                  onInput={handleTerminalInput}
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
                  onClick={() => cancelTerminal()}
                  className="flex-1 px-3 py-2 text-sm text-white rounded border border-red-800 transition-colors bg-red-900/50 hover:bg-red-900"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => setRightSidebarView("prompt")}
                className="flex-1 px-3 py-2 text-sm text-white rounded border transition-colors bg-secondary border-border hover:bg-accent"
              >
                {isTerminalRunning ? "Return to Prompt" : "Back to Prompt"}
              </button>
            </div>
          </div>

          {/* Iframe / OpenCode Web View */}
          <div
            className={`flex overflow-hidden flex-col flex-1 h-full ${ rightSidebarView === "iframe" ? "" : "hidden" }`}
          >
            <div className="relative flex-1 min-h-0 bg-black">
              {iframeUrl ? (
                <iframe
                  src={iframeUrl}
                  className="w-full h-full bg-black border-0"
                  onLoad={() => {
                    setIsOpenCodeWebLoading(false);
                    const msg = pendingOpenCodeWebMessage;
                    if (msg) {
                      setPendingOpenCodeWebMessage(null);
                      void fetch("/api/opencode/message", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(msg),
                      }).catch(() => undefined);
                    }
                  }}
                />
              ) : (
                <div className="flex justify-center items-center h-full text-xs text-muted-foreground">
                  {openCodeWebError || "No URL loaded"}
                </div>
              )}

              {isOpenCodeWebLoading && (
                <div className="flex absolute inset-0 flex-col gap-3 justify-center items-center bg-black">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin border-muted-foreground border-t-transparent" />
                  <div className="text-xs text-muted-foreground">
                    {openCodeWebLoadingLabel || "Loading…"}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-2 border-t border-border">
              <button
                onClick={() => setRightSidebarView("prompt")}
                className="px-3 py-2 w-full text-sm text-white rounded border transition-colors bg-secondary border-border hover:bg-accent"
              >
                Return to Prompt
              </button>
            </div>
          </div>

          {/* Prompt View */}
          <div
            className={`flex overflow-hidden flex-col flex-1 ${ rightSidebarView === "prompt" ? "" : "hidden" }`}
          >
            <div className="flex gap-2 p-3 border-b border-border">
              {viewMode === "tests" ? (
                <button
                  onClick={() => selectedFile && handleRunTest(selectedFile.path)}
                  disabled={!selectedFile || isTestRunning}
                  className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-foreground"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isTestRunning ? "Running…" : "Run test"}
                </button>
              ) : viewMode === "ai" || workDocIsDraft ? (
                <button
                  onClick={openInteractiveTerminal}
                  disabled={isTerminalRunning}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-foreground"
                  title="Open interactive terminal"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Terminal
                </button>
              ) : (
                <div className="flex flex-1 p-1 rounded-lg border border-border bg-background">
                  <button
                    onClick={() => setDocAiMode("modify")}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${ docAiMode === "modify" ? "bg-secondary text-white shadow-sm border border-border" : "text-muted-foreground hover:text-foreground" }`}
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => setDocAiMode("start")}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${ docAiMode === "start" ? "bg-secondary text-white shadow-sm border border-border" : "text-muted-foreground hover:text-foreground" }`}
                  >
                    {selectedFile?.path
                      ?.replace(/\\/g, "/")
                      .includes("/.agelum/work/epics/") ||
                    selectedFile?.path
                      ?.replace(/\\/g, "/")
                      .includes("/agelum/epics/") ||
                    viewMode === "epics"
                      ? "Create tasks"
                      : "Start"}
                  </button>
                </div>
              )}

              <div className="flex relative flex-1 justify-end items-center">
                <select
                  value={promptMode}
                  onChange={(e) => setPromptMode(e.target.value as any)}
                  className="pr-6 w-full h-full text-xs text-right bg-transparent appearance-none cursor-pointer outline-none text-muted-foreground hover:text-foreground"
                >
                  <option value="agent" className="text-right bg-secondary">
                    Agent
                  </option>
                  <option value="plan" className="text-right bg-secondary">
                    Plan
                  </option>
                  <option value="chat" className="text-right bg-secondary">
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
                              (prev) => {
                                const lastAt =
                                  prev.lastIndexOf(
                                    "@",
                                  );
                                return (
                                  prev.substring(
                                    0,
                                    lastAt + 1,
                                  ) +
                                  f.name +
                                  " "
                                );
                              },
                            );
                            setFileMap(
                              (prev) => ({
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
                      className={`p-1.5 rounded-md transition-colors ${ isRecording
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
                  {agentTools.map(
                    (tool) => {
                      const models =
                        toolModelsByTool[tool.name] || [];
                      const selectedModel =
                        toolModelByTool[tool.name] || "";
                      const isActive =
                        isTerminalRunning &&
                        terminalToolName === tool.name;

                      return (
                        <div
                          key={tool.name}
                          onMouseEnter={() =>
                            void ensureModelsForTool(
                              tool.name,
                            )
                          }
                          className={`flex flex-col w-full rounded-lg border overflow-hidden transition-all ${ tool.available
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
                                runTool(tool.name);
                              }
                            }}
                            disabled={
                              !tool.available ||
                              (!isActive && !promptText.trim())
                            }
                            className="flex-1 px-3 py-3 text-left group disabled:opacity-50"
                          >
                            <div className="flex gap-2 items-center mb-0.5">
                              <div className="text-sm font-medium text-foreground group-hover:text-white">
                                {tool.displayName}
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
                              value={selectedModel}
                              onChange={(e) =>
                                setToolModelByTool(
                                  (prev) => ({
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
                              <option value="">Default</option>
                              {models.map(
                                (model) => (
                                  <option
                                    key={model}
                                    value={model}
                                  >
                                    {model}
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
                      isOpenCodeWebLoading || iframeUrl;
                    return (
                      <div
                        className={`flex overflow-hidden flex-col w-full rounded-lg border shadow-sm transition-all ${ isOpenCodeActive
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
                            setIframeUrl("");
                            setOpenCodeWebError("");
                            setIsOpenCodeWebLoading(
                              true,
                            );
                            setOpenCodeWebLoadingLabel(
                              "Starting OpenCode…",
                            );
                            setPendingOpenCodeWebMessage(null);
                            try {
                              let apiPath =
                                "/api/opencode";
                              const params =
                                new URLSearchParams();
                              let fullPath = "";
                              if (
                                basePath &&
                                selectedRepo
                              ) {
                                const nextFullPath =
                                  `${basePath}/${selectedRepo}`.replace(
                                    /\\+/g,
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
                              if (trimmedPrompt) {
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
                                apiPath +=
                                  `?${queryString}`;
                              }
                              const res =
                                await fetch(
                                  apiPath,
                                );
                              const data = await res.json();
                              if (data?.url) {
                                setIframeUrl(
                                  data.url,
                                );
                                setOpenCodeWebLoadingLabel(
                                  "Loading OpenCode Web…",
                                );
                                if (trimmedPrompt && data?.sessionId) {
                                  // We don't have buildToolPrompt here, but we can access it via ref or just not send it for now
                                  // or duplicate logic.
                                  // Wait, runTool has access to buildToolPrompt.
                                  // I should extract this button logic too.
                                  // For now, I'll just set the prompt text and let user handle it.
                                  setPendingOpenCodeWebMessage({
                                    sessionId: data.sessionId,
                                    prompt: trimmedPrompt, // Simplified
                                    path: fullPath || undefined,
                                  });
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
                          disabled={isOpenCodeWebLoading}
                          className="flex-1 px-3 py-3 text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <div className="flex gap-2 items-center mb-0.5">
                            <div className="text-sm font-medium text-foreground group-hover:text-white">
                              OpenCode Web
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
                            Web Interface
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors outline-none focus:outline-none ring-0 ${ viewMode === mode
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

              {!isAppRunning && (
                <button
                  onClick={openInteractiveTerminal}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Open Terminal"
                >
                  <Terminal className="w-4 h-4" />
                </button>
              )}

              {isAppRunning && isAppManaged && (
                <button
                  onClick={() => {
                    setRightSidebarView("terminal");
                    state.setTerminalToolName("App Logs"); // Use state setter directly
                  }}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-accent transition-colors"
                  title="View Logs"
                >
                  <ScrollText className="w-4 h-4" />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setIsAppActionsMenuOpen(!isAppActionsMenuOpen)}
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
              setSettingsTab("defaults");
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
          {viewMode === "docs" ? (
            <DocsTab
              fileTree={fileTree}
              currentPath={currentPath}
              basePath={basePath}
              selectedFile={selectedFile}
              renderWorkEditor={renderWorkEditor}
              onFileSelect={handleFileSelect}
              onRefresh={loadFileTree}
              onBack={() => setSelectedFile(null)}
              onRename={async (newTitle) => {
                if (!selectedFile) return;
                const oldPath = selectedFile.path;
                const dir = oldPath.split("/").slice(0, -1).join("/");
                const fileName = oldPath.split("/").pop() || "";
                const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
                const newPath =
                  ext &&
                  newTitle.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
                    ? `${dir}/${newTitle}`
                    : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;
                const res = await fetch("/api/file", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    path: oldPath,
                    newPath: newPath,
                    action: "rename",
                  }),
                });
                const data = await res.json();
                if (!res.ok)
                  throw new Error(data.error || "Failed to rename file");
                const next = { path: data.path, content: selectedFile.content };
                setSelectedFile(next);
                loadFileTree();
                return next;
              }}
            />
          ) : viewMode === "ai" ? (
            <AITab
              fileTree={fileTree}
              currentPath={currentPath}
              basePath={basePath}
              selectedFile={selectedFile}
              renderWorkEditor={renderWorkEditor}
              onFileSelect={handleFileSelect}
              onRefresh={loadFileTree}
              onBack={() => setSelectedFile(null)}
              onRename={async (newTitle) => {
                if (!selectedFile) return;
                const oldPath = selectedFile.path;
                const dir = oldPath.split("/").slice(0, -1).join("/");
                const fileName = oldPath.split("/").pop() || "";
                const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
                const newPath =
                  ext &&
                  newTitle.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
                    ? `${dir}/${newTitle}`
                    : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;
                const res = await fetch("/api/file", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    path: oldPath,
                    newPath: newPath,
                    action: "rename",
                  }),
                });
                const data = await res.json();
                if (!res.ok)
                  throw new Error(data.error || "Failed to rename file");
                const next = { path: data.path, content: selectedFile.content };
                setSelectedFile(next);
                loadFileTree();
                return next;
              }}
            />
          ) : viewMode === "tests" ? (
            <TestsTab
              fileTree={fileTree}
              currentPath={currentPath}
              basePath={basePath}
              selectedFile={selectedFile}
              testsSetupStatus={testsSetupStatus}
              isSetupLogsVisible={isSetupLogsVisible}
              renderWorkEditor={renderWorkEditor}
              onFileSelect={handleFileSelect}
              onRefresh={loadFileTree}
              onRunTest={handleRunTest}
              onSetupLogsVisibleChange={setIsSetupLogsVisible}
              onBack={() => setSelectedFile(null)}
              onRename={async (newTitle) => {
                if (!selectedFile) return;
                const oldPath = selectedFile.path;
                const dir = oldPath.split("/").slice(0, -1).join("/");
                const fileName = oldPath.split("/").pop() || "";
                const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
                const newPath =
                  ext &&
                  newTitle.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
                    ? `${dir}/${newTitle}`
                    : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;
                const res = await fetch("/api/file", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    path: oldPath,
                    newPath: newPath,
                    action: "rename",
                  }),
                });
                const data = await res.json();
                if (!res.ok)
                  throw new Error(data.error || "Failed to rename file");
                const next = { path: data.path, content: selectedFile.content };
                setSelectedFile(next);
                loadFileTree();
                return next;
              }}
            />
          ) : viewMode === "ideas" ? (
            <IdeasTab
              selectedRepo={selectedRepo}
              selectedFile={selectedFile}
              renderWorkEditor={renderWorkEditor}
              onIdeaSelect={handleIdeaSelect}
              onCreateIdea={({ state: s }) =>
                openWorkDraft({ kind: "idea", state: s })
              }
              onBack={() => setSelectedFile(null)}
              onRename={
                selectedRepo
                  ? async (newTitle: string) => {
                      const res = await fetch("/api/ideas", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          repo: selectedRepo,
                          action: "rename",
                          path: selectedFile!.path,
                          newTitle,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok)
                        throw new Error(data.error || "Failed to rename idea");
                      const next = {
                        path: data.path as string,
                        content: data.content as string,
                      };
                      setSelectedFile(next);
                      return next;
                    }
                  : undefined
              }
            />
          ) : viewMode === "epics" ? (
            <EpicsTab
              selectedRepo={selectedRepo}
              selectedFile={selectedFile}
              renderWorkEditor={renderWorkEditor}
              onEpicSelect={handleEpicSelect}
              onCreateEpic={({ state: s }) =>
                openWorkDraft({ kind: "epic", state: s })
              }
              onBack={() => setSelectedFile(null)}
              onRename={
                selectedRepo
                  ? async (newTitle: string) => {
                      const res = await fetch("/api/epics", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          repo: selectedRepo,
                          action: "rename",
                          path: selectedFile!.path,
                          newTitle,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok)
                        throw new Error(data.error || "Failed to rename epic");
                      const next = {
                        path: data.path as string,
                        content: data.content as string,
                      };
                      setSelectedFile(next);
                      return next;
                    }
                  : undefined
              }
            />
          ) : viewMode === "review" ? (
            <ReviewTab
              fileTree={fileTree}
              currentPath={currentPath}
              basePath={basePath}
              selectedFile={selectedFile}
              selectedRepo={selectedRepo}
              onFileSelect={(node) =>
                setSelectedFile({
                  path: node.path,
                  content: node.content || "",
                })
              }
              onRefresh={loadFileTree}
              onSaveFile={async ({ content }) => {
                const res = await fetch("/api/files", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    repo: selectedRepo,
                    path: selectedFile!.path,
                    content,
                  }),
                });
                if (!res.ok) throw new Error("Failed to save file");
                setSelectedFile({ ...selectedFile!, content });
              }}
            />
          ) : viewMode === "logs" ? (
            <LogsTab
              appLogs={appLogs}
              isAppStarting={isAppStarting}
              appPid={appPid}
              isAppRunning={isAppRunning}
            />
          ) : viewMode === "browser" ? (
            <BrowserTab
              iframeUrl={iframeUrl}
              isElectron={isElectron}
              isScreenshotMode={isScreenshotMode}
              selectedRepo={selectedRepo}
              repositories={repositories}
              browserIframeRef={browserIframeRef}
              browserViewPlaceholderRef={browserViewPlaceholderRef}
              onIframeUrlChange={setIframeUrl}
              onRequestCapture={requestEmbeddedCapture}
              onScreenshotModeChange={setIsScreenshotMode}
              onTaskCreated={() => {
                /* Optional: toast */
              }}
            />
          ) : (
            <TasksTab
              selectedRepo={selectedRepo}
              selectedFile={selectedFile}
              renderWorkEditor={renderWorkEditor}
              onTaskSelect={handleTaskSelect}
              onCreateTask={({ state: s }) =>
                openWorkDraft({ kind: "task", state: s })
              }
              onBack={() => setSelectedFile(null)}
              onRename={
                viewMode === "kanban" && selectedRepo
                  ? async (newTitle: string) => {
                      const res = await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          repo: selectedRepo,
                          action: "rename",
                          path: selectedFile!.path,
                          newTitle,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok)
                        throw new Error(data.error || "Failed to rename task");
                      const next = {
                        path: data.path as string,
                        content: data.content as string,
                      };
                      setSelectedFile(next);
                      return next;
                    }
                  : undefined
              }
            />
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
