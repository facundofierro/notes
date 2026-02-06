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
import { useHomeStore } from "@/store/useHomeStore";

export default function Home() {
  const store = useHomeStore();
  const {
    fetchSettings,
    fetchRepositories,
    selectedRepo,
    viewMode,
    setSelectedFile,
    setAgentTools,
    setLogStreamPid,
    setAppLogs,
    currentPath,
    repositories,
    settings,
    projectConfig,
    setProjectConfig,
    setIsElectron,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsTab,
    setIsAppRunning,
    setIsAppManaged,
    setAppPid,
    logStreamPid,
    isAppStarting,
    setIsAppStarting,
    appLogsAbortController,
    setAppLogsAbortController,
  } = store;

  const currentProjectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)?.path ||
      settings.projects?.find((p) => p.name === selectedRepo)?.path ||
      null
    );
  }, [repositories, selectedRepo, settings.projects]);

  const currentProjectConfig = React.useMemo(() => {
    return settings.projects?.find((p) => p.name === selectedRepo) || projectConfig || null;
  }, [selectedRepo, settings.projects, projectConfig]);

  // Initial data fetching
  React.useEffect(() => {
    fetchSettings();
    fetchRepositories();
  }, [fetchSettings, fetchRepositories]);

  // Detect Electron environment on mount
  React.useEffect(() => {
    setIsElectron(!!window.electronAPI?.browserView);
  }, [setIsElectron]);

  // Fetch agent tools
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/agents?action=tools")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const tools = (data.tools || []) as Array<{ name: string; displayName: string; available: boolean }>;
        setAgentTools(tools);
      })
      .catch(() => {
        if (cancelled) return;
        setAgentTools([]);
      });
    return () => { cancelled = true; };
  }, [setAgentTools]);

  // Save selected repo to local storage
  React.useEffect(() => {
    if (!selectedRepo) return;
    window.localStorage.setItem("agelum.selectedRepo", selectedRepo);
  }, [selectedRepo]);

  // Clear selected file on view or repo change
  React.useEffect(() => {
    setSelectedFile(null);
  }, [viewMode, selectedRepo, setSelectedFile]);

  // Clear log streaming when repo changes
  React.useEffect(() => {
    setLogStreamPid(null);
    setAppLogs("");
  }, [selectedRepo, setLogStreamPid, setAppLogs]);

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

  // Refresh app status on project change or tab change to logs/browser
  const lastStatusRepoRef = React.useRef<string | null>(null);
  const lastStatusViewModeRef = React.useRef<string | null>(null);

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
        if (data.isManaged && data.pid && !logStreamPid) {
          setLogStreamPid(data.pid);
        }
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
  }, [selectedRepo, viewMode, setIsAppRunning, setIsAppManaged, setAppPid, logStreamPid, setLogStreamPid]);

  // Stream app logs
  React.useEffect(() => {
    if (!logStreamPid) return;
    let cancelled = false;
    let hasLoggedRecently = false;
    let startTimeoutId: number | null = null;

    const streamLogs = async () => {
      const ac = new AbortController();
      setAppLogsAbortController(ac);
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
      if (appLogsAbortController) {
        appLogsAbortController.abort();
        setAppLogsAbortController(null);
      }
    };
  }, [logStreamPid, selectedRepo, currentProjectConfig?.url, isAppStarting, setAppLogs, setIsAppStarting, appLogsAbortController, setAppLogsAbortController]);

  return (
    <div className="flex flex-col w-full h-full">
      <Header />

      <div className="flex overflow-hidden flex-col flex-1">
        <div className="flex overflow-hidden flex-1">
          {viewMode === "docs" ? (
            <DocsTab />
          ) : viewMode === "ai" ? (
            <AITab />
          ) : viewMode === "tests" ? (
            <TestsTab />
          ) : viewMode === "ideas" ? (
            <IdeasTab />
          ) : viewMode === "epics" ? (
            <EpicsTab />
          ) : viewMode === "review" ? (
            <ReviewTab />
          ) : viewMode === "logs" ? (
            <LogsTab />
          ) : viewMode === "browser" ? (
            <BrowserTab />
          ) : (
            <TasksTab />
          )}
        </div>
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSave={fetchSettings}
        initialTab={settingsTab}
        projectName={selectedRepo || undefined}
        projectPath={currentProjectPath || undefined}
      />
    </div>
  );
}
