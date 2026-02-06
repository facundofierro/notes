"use client";

import * as React from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { IdeasTab } from "@/components/tabs/IdeasTab";
import { DocsTab } from "@/components/tabs/DocsTab";
import { EpicsTab } from "@/components/tabs/EpicsTab";
import { TasksTab } from "@/components/tabs/TasksTab";
import { TestsTab } from "@/components/tabs/TestsTab";
import { ReviewTab } from "@/components/tabs/ReviewTab";
import { AITab } from "@/components/tabs/AITab";
import { LogsTab } from "@/components/tabs/LogsTab";
import { BrowserTab } from "@/components/tabs/BrowserTab";
import { Header } from "@/components/Header";
import { useSettings } from "@/hooks/use-settings";
import { VIEW_MODE_CONFIG, ViewMode } from "@/lib/view-config";
import { useHomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";
import { WorkEditor } from "@/components/WorkEditor";

export default function Home() {
  const { settings } = useSettings();
  const state = useHomeState();
  const callbacks = useHomeCallbacks(state);

  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    currentPath,
    selectedFile,
    setSelectedFile,
    basePath,
    viewMode,
    setViewMode,
    testViewMode,
    setTestViewMode,
    testOutput,
    isTestRunning,
    workEditorEditing,
    setWorkEditorEditing,
    agentTools,
    iframeUrl,
    setIframeUrl,
    projectConfig,
    setProjectConfig,
    workDocIsDraft,
    setWorkDocIsDraft,
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
    openWorkDraft,
    handleStartApp,
    handleStopApp,
    handleRestartApp,
    handleRunTest,
    handleFileSelect,
    handleTaskSelect,
    handleEpicSelect,
    handleIdeaSelect,
    browserIframeRef,
    handleInstallDeps,
    handleBuildApp,
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
    window.addEventListener("resize", syncBounds);
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
    const unsubNav = api.onNavigated((url, isInsecure) => {
      electronLoadedUrlRef.current = url;
      setIframeUrl(url);
      state.setIsIframeInsecure(!!isInsecure);
    });
    return () => {
      unsubNav();
    };
  }, [isElectron, setIframeUrl, state]);

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

    if (!selectedRepo || !settings.projects) return defaultItems;
    const project = settings.projects.find((p) => p.name === selectedRepo);
    const workflowId = project?.workflowId || settings.defaultWorkflowId;
    if (!workflowId) return defaultItems;
    const workflow = settings.workflows?.find((w) => w.id === workflowId);
    if (!workflow) return defaultItems;
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
  }, [state.setAgentTools]);

  React.useEffect(() => {
    if (!selectedRepo) return;
    window.localStorage.setItem("agelum.selectedRepo", selectedRepo);
  }, [selectedRepo]);

  React.useEffect(() => {
    setSelectedFile(null);
  }, [viewMode, selectedRepo, setSelectedFile]);

  // Clear log streaming when repo changes
  React.useEffect(() => {
    state.setLogStreamPid(null);
    state.setAppLogs("");
  }, [selectedRepo, state]);

  // Fetch project configuration
  React.useEffect(() => {
    if (!currentProjectPath) {
      setProjectConfig(null);
      return;
    }
    let cancelled = false;
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/project/config?path=${encodeURIComponent(currentProjectPath)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setProjectConfig(data.config || null);
      } catch (error) {
        console.error("Error fetching project config:", error);
      }
    };
    fetchConfig();
    return () => { cancelled = true; };
  }, [currentProjectPath, setProjectConfig]);

  // Sync iframeUrl with project url
  const lastUrlRepoRef = React.useRef<string | null>(null);
  const [preservedIframeUrls, setPreservedIframeUrls] = React.useState<Record<string, string>>({});

  // Save current URL to preservedUrls whenever it changes in browser mode
  React.useEffect(() => {
    if (viewMode === "browser" && selectedRepo && iframeUrl) {
      setPreservedIframeUrls((prev) => {
        if (prev[selectedRepo] === iframeUrl) return prev;
        return { ...prev, [selectedRepo]: iframeUrl };
      });
    }
  }, [viewMode, selectedRepo, iframeUrl]);

  // Restore or set initial URL when entering browser mode or switching repo
  React.useEffect(() => {
    if (viewMode !== "browser" || !selectedRepo) return;

    const repoChanged = selectedRepo !== lastUrlRepoRef.current;
    lastUrlRepoRef.current = selectedRepo;

    const preserved = preservedIframeUrls[selectedRepo];
    const targetUrl = repoChanged 
      ? (currentProjectConfig?.url || "") 
      : (preserved || currentProjectConfig?.url || "");

    const normalize = (u: string) => (u || "").replace(/\/$/, "");
    if (normalize(iframeUrl) !== normalize(targetUrl)) {
      setIframeUrl(targetUrl);
    }
  }, [viewMode, selectedRepo, currentProjectConfig?.url]);

  // Refresh app status on project change or tab change to logs/browser
  const lastStatusRepoRef = React.useRef<string | null>(null);
  const lastStatusViewModeRef = React.useRef<ViewMode | null>(null);

  React.useEffect(() => {
    if (!selectedRepo) {
      setIsAppRunning(false);
      setIsAppManaged(false);
      setAppPid(null);
      return;
    }

    const isTargetView = viewMode === "logs" || viewMode === "browser";
    const repoChanged = selectedRepo !== lastStatusRepoRef.current;
    const viewChangedToTarget = isTargetView && viewMode !== lastStatusViewModeRef.current;

    lastStatusRepoRef.current = selectedRepo;
    lastStatusViewModeRef.current = viewMode;

    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/app-status?repo=${selectedRepo}`);
        const data = await res.json();
        if (cancelled) return;
        setIsAppRunning(data.isRunning);
        setIsAppManaged(data.isManaged);
        setAppPid(data.pid || null);
      } catch {
        if (cancelled) return;
        setIsAppRunning(false);
        setIsAppManaged(false);
        setAppPid(null);
      }
    };

    if (repoChanged || viewChangedToTarget) {
      checkStatus();
    }

    const handleFocus = () => {
      if (isTargetView) checkStatus();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedRepo, viewMode, setIsAppRunning, setIsAppManaged, setAppPid]);

  // Stream app logs
  React.useEffect(() => {
    if (!logStreamPid) return;
    let cancelled = false;
    let hasLoggedRecently = false;
    let startTimeoutId: number | null = null;

    const streamLogs = async () => {
      appLogsAbortControllerRef.current = new AbortController();
      const ac = appLogsAbortControllerRef.current;
      try {
        const res = await fetch(`/api/app-logs?pid=${logStreamPid}`, { signal: ac.signal });
        if (!res.ok || !res.body) {
          setAppLogs((prev) => prev + "\x1b[31mError: Failed to stream logs\x1b[0m\n");
          setIsAppStarting(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        if (startTimeoutId !== null) window.clearTimeout(startTimeoutId);
        startTimeoutId = window.setTimeout(() => { if (!hasLoggedRecently) setIsAppStarting(false); }, 2000);

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
                  hasLoggedRecently = true;
                  if (!currentProjectConfig?.url) setIsAppStarting(false);
                }
              } catch {
                setAppLogs((prev) => prev + line + "\n");
                hasLoggedRecently = true;
                if (!currentProjectConfig?.url) setIsAppStarting(false);
              }
            }
          }
        }
        setIsAppStarting(false);
      } catch (error: any) {
        if (error.name !== "AbortError" && !cancelled) setAppLogs((prev) => prev + `\x1b[31mLog streaming error: ${error.message}\x1b[0m\n`);
        setIsAppStarting(false);
      }
    };
    streamLogs();

    return () => {
      cancelled = true;
      if (startTimeoutId !== null) window.clearTimeout(startTimeoutId);
      if (appLogsAbortControllerRef.current) {
        appLogsAbortControllerRef.current.abort();
        appLogsAbortControllerRef.current = null;
      }
    };
  }, [logStreamPid, selectedRepo, currentProjectConfig?.url, isAppStarting, setAppLogs, setIsAppStarting, setIframeUrl, setViewMode, appLogsAbortControllerRef]);

    return (

      <div className="flex flex-col w-full h-full">

        <Header

          viewMode={viewMode}

          setViewMode={setViewMode}

          visibleItems={visibleItems}

          repositories={repositories}

          selectedRepo={selectedRepo}

          setSelectedRepo={setSelectedRepo}

          isAppRunning={isAppRunning}

          handleStartApp={handleStartApp}

          handleStopApp={handleStopApp}

          isAppManaged={isAppManaged}

          handleRestartApp={handleRestartApp}

          handleInstallDeps={handleInstallDeps}

          handleBuildApp={handleBuildApp}

          setSettingsTab={setSettingsTab}

          setIsSettingsOpen={setIsSettingsOpen}

        />

  

        <div className="flex overflow-hidden flex-col flex-1">

          <div className="flex overflow-hidden flex-1">

            {viewMode === "docs" ? (

              <DocsTab state={state} callbacks={callbacks} />

            ) : viewMode === "ai" ? (

              <AITab state={state} callbacks={callbacks} />

            ) : viewMode === "tests" ? (

              <TestsTab state={state} callbacks={callbacks} />

            ) : viewMode === "ideas" ? (

              <IdeasTab state={state} callbacks={callbacks} />

            ) : viewMode === "epics" ? (

              <EpicsTab state={state} callbacks={callbacks} />

            ) : viewMode === "review" ? (

              <ReviewTab state={state} callbacks={callbacks} />

            ) : viewMode === "logs" ? (

              <LogsTab state={state} />

            ) : viewMode === "browser" ? (

              <BrowserTab

                state={state}

                callbacks={callbacks}

                browserViewPlaceholderRef={browserViewPlaceholderRef}

              />

            ) : (

              <TasksTab state={state} callbacks={callbacks} />

            )}

          </div>

        </div>

        <SettingsDialog

          open={isSettingsOpen}

          onOpenChange={setIsSettingsOpen}

          onSave={handleSettingsSave}

          initialTab={settingsTab}

          projectName={selectedRepo || undefined}

          projectPath={

            selectedRepo

              ? repositories.find((r) => r.name === selectedRepo)?.path

              : undefined

          }

        />

      </div>

    );

  }

  