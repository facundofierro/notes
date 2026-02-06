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
  }, [state]);

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
  const isEnteringBrowserView = React.useRef(false);
  const [preservedIframeUrl, setPreservedIframeUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (viewMode === "browser" && !isEnteringBrowserView.current) {
      isEnteringBrowserView.current = true;
      if (preservedIframeUrl) setIframeUrl(preservedIframeUrl);
      else if (currentProjectConfig?.url) {
        setIframeUrl(currentProjectConfig.url);
        setPreservedIframeUrl(currentProjectConfig.url);
      } else setIframeUrl("");
    } else if (viewMode !== "browser") {
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
        const data = await res.json();
        if (cancelled) return;
        if (data.isRunning !== isAppRunning || data.isManaged !== isAppManaged || (data.pid || null) !== appPid) {
          setIsAppRunning(data.isRunning);
          setIsAppManaged(data.isManaged);
          setAppPid(data.pid || null);
        }
      } catch {
        if (cancelled) return;
        setIsAppRunning(false);
        setIsAppManaged(false);
        setAppPid(null);
      }
    };
    checkStatus();
    const handleFocus = () => checkStatus();
    window.addEventListener('focus', handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedRepo, currentProjectConfig?.url, isAppRunning, isAppManaged, appPid, setIsAppRunning, setIsAppManaged, setAppPid]);

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

    const readinessInterval = window.setInterval(async () => {
      if (cancelled) return;
      if (isAppStarting && currentProjectConfig?.url) {
        try {
          const checkRes = await fetch(`/api/app-status?repo=${selectedRepo}`);
          const status = await checkRes.json();
          if (status.isUrlReady) {
            setIsAppStarting(false);
            setIframeUrl(currentProjectConfig.url);
            setViewMode("browser");
          }
        } catch (error) { console.error("Readiness check error:", error); }
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(readinessInterval);
      if (startTimeoutId !== null) window.clearTimeout(startTimeoutId);
      if (appLogsAbortControllerRef.current) {
        appLogsAbortControllerRef.current.abort();
        appLogsAbortControllerRef.current = null;
      }
    };
  }, [logStreamPid, selectedRepo, currentProjectConfig?.url, isAppStarting, setAppLogs, setIsAppStarting, setIframeUrl, setViewMode, appLogsAbortControllerRef]);

  const renderWorkEditor = (opts: {
    onBack: () => void;
    onRename?: (newTitle: string) => Promise<{ path: string; content: string } | void>;
    onRefresh?: () => void;
  }) => {
    if (!selectedFile) return null;
    return (
      <WorkEditor
        file={selectedFile}
        onFileChange={setSelectedFile}
        onBack={opts.onBack}
        onRename={opts.onRename}
        onRefresh={opts.onRefresh}
        viewMode={viewMode}
        selectedRepo={selectedRepo}
        basePath={basePath}
        agentTools={agentTools}
        workEditorEditing={workEditorEditing}
        onWorkEditorEditingChange={setWorkEditorEditing}
        workDocIsDraft={workDocIsDraft}
        testViewMode={testViewMode}
        onTestViewModeChange={setTestViewMode}
        testOutput={testOutput}
        isTestRunning={isTestRunning}
        onRunTest={handleRunTest}
      />
    );
  };

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
            <DocsTab selectedRepo={selectedRepo} currentPath={currentPath} basePath={basePath} selectedFile={selectedFile} renderWorkEditor={renderWorkEditor} onFileSelect={handleFileSelect} onBack={() => setSelectedFile(null)} onSelectedFileChange={setSelectedFile} />
          ) : viewMode === "ai" ? (
            <AITab selectedRepo={selectedRepo} currentPath={currentPath} basePath={basePath} selectedFile={selectedFile} renderWorkEditor={renderWorkEditor} onFileSelect={handleFileSelect} onBack={() => setSelectedFile(null)} onSelectedFileChange={setSelectedFile} />
          ) : viewMode === "tests" ? (
            <TestsTab selectedRepo={selectedRepo} currentPath={currentPath} basePath={basePath} selectedFile={selectedFile} renderWorkEditor={renderWorkEditor} onFileSelect={handleFileSelect} onRunTest={handleRunTest} onBack={() => setSelectedFile(null)} onSelectedFileChange={setSelectedFile} />
          ) : viewMode === "ideas" ? (
            <IdeasTab selectedRepo={selectedRepo} selectedFile={selectedFile} renderWorkEditor={renderWorkEditor} onIdeaSelect={handleIdeaSelect} onCreateIdea={({ state: s }) => openWorkDraft({ kind: "idea", state: s })} onBack={() => setSelectedFile(null)} onRename={selectedRepo ? async (newTitle: string) => {
              const res = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: selectedRepo, action: "rename", path: selectedFile!.path, newTitle }) });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to rename idea");
              const next = { path: data.path as string, content: data.content as string };
              setSelectedFile(next);
              return next;
            } : undefined} />
          ) : viewMode === "epics" ? (
            <EpicsTab selectedRepo={selectedRepo} selectedFile={selectedFile} renderWorkEditor={renderWorkEditor} onEpicSelect={handleEpicSelect} onCreateEpic={({ state: s }) => openWorkDraft({ kind: "epic", state: s })} onBack={() => setSelectedFile(null)} onRename={selectedRepo ? async (newTitle: string) => {
              const res = await fetch("/api/epics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: selectedRepo, action: "rename", path: selectedFile!.path, newTitle }) });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to rename epic");
              const next = { path: data.path as string, content: data.content as string };
              setSelectedFile(next);
              return next;
            } : undefined} />
          ) : viewMode === "review" ? (
            <ReviewTab currentPath={currentPath} basePath={basePath} selectedFile={selectedFile} selectedRepo={selectedRepo} onFileSelect={(node) => setSelectedFile({ path: node.path, content: node.content || "" })} onSelectedFileChange={setSelectedFile} />
          ) : viewMode === "logs" ? (
            <LogsTab appLogs={appLogs} isAppStarting={isAppStarting} appPid={appPid} isAppRunning={isAppRunning} />
          ) : viewMode === "browser" ? (
            <BrowserTab iframeUrl={iframeUrl} isElectron={isElectron} isScreenshotMode={isScreenshotMode} selectedRepo={selectedRepo} repositories={repositories} browserIframeRef={browserIframeRef} browserViewPlaceholderRef={browserViewPlaceholderRef} onIframeUrlChange={setIframeUrl} onRequestCapture={requestEmbeddedCapture} onScreenshotModeChange={setIsScreenshotMode} onTaskCreated={() => {}} />
          ) : (
            <TasksTab selectedRepo={selectedRepo} selectedFile={selectedFile} renderWorkEditor={renderWorkEditor} onTaskSelect={handleTaskSelect} onCreateTask={({ state: s }) => openWorkDraft({ kind: "task", state: s })} onBack={() => setSelectedFile(null)} onRename={viewMode === "kanban" && selectedRepo ? async (newTitle: string) => {
              const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: selectedRepo, action: "rename", path: selectedFile!.path, newTitle }) });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to rename task");
              const next = { path: data.path as string, content: data.content as string };
              setSelectedFile(next);
              return next;
            } : undefined} />
          )}
        </div>
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onSave={handleSettingsSave} initialTab={settingsTab} projectName={selectedRepo || undefined} projectPath={selectedRepo ? repositories.find((r) => r.name === selectedRepo)?.path : undefined} />
    </div>
  );
}