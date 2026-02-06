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
import { useHomeStore, ProjectState } from "@/store/useHomeStore";

export default function Home() {
  const store = useHomeStore();
  const {
    fetchSettings,
    fetchRepositories,
    selectedRepo,
    setProjectState,
    repositories,
    settings,
    setIsElectron,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsTab,
    projectStates,
  } = store;

  // Initial data fetching
  React.useEffect(() => {
    fetchSettings();
    fetchRepositories();
  }, [fetchSettings, fetchRepositories]);

  // Detect Electron environment on mount
  React.useEffect(() => {
    setIsElectron(!!window.electronAPI?.browserView);
  }, [setIsElectron]);

  // Save selected repo to local storage
  React.useEffect(() => {
    if (!selectedRepo) return;
    window.localStorage.setItem("agelum.selectedRepo", selectedRepo);
  }, [selectedRepo]);

  const currentProjectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)?.path ||
      settings.projects?.find((p) => p.name === selectedRepo)?.path ||
      null
    );
  }, [repositories, selectedRepo, settings.projects]);

  return (
    <div className="flex flex-col w-full h-full">
      <Header />

      <div className="flex overflow-hidden flex-col flex-1 relative">
        {Object.entries(projectStates).map(([repoName, projectState]) => (
          <div 
            key={repoName} 
            className={`absolute inset-0 flex flex-col ${repoName === selectedRepo ? "z-10 visible" : "z-0 invisible"}`}
          >
            <ProjectView repoName={repoName} projectState={projectState} />
          </div>
        ))}
        {!selectedRepo && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground bg-background">
            Select a project to get started
          </div>
        )}
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSave={fetchSettings}
        initialTab={settingsTab as any}
        projectName={["project-config", "project-commands", "project-preview"].includes(settingsTab) ? selectedRepo || undefined : undefined}
        projectPath={["project-config", "project-commands", "project-preview"].includes(settingsTab) ? currentProjectPath || undefined : undefined}
      />
    </div>
  );
}

function ProjectView({ repoName, projectState }: { repoName: string; projectState: ProjectState }) {
  const store = useHomeStore();
  const {
    repositories,
    settings,
    setProjectState,
  } = store;

  const { viewMode, logStreamPid, isAppStarting, projectConfig } = projectState;

  const currentProjectPath = React.useMemo(() => {
    return (
      repositories.find((r) => r.name === repoName)?.path ||
      settings.projects?.find((p) => p.name === repoName)?.path ||
      null
    );
  }, [repositories, repoName, settings.projects]);

  const currentProjectConfig = React.useMemo(() => {
    return settings.projects?.find((p) => p.name === repoName) || projectConfig || null;
  }, [repoName, settings.projects, projectConfig]);

  // Project-specific background effects (Status, Logs, Config)
  React.useEffect(() => {
    if (!currentProjectPath) return;
    let cancelled = false;
    fetch(`/api/project/config?path=${encodeURIComponent(currentProjectPath)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data) {
          setProjectState(prev => ({ ...prev, projectConfig: data.config || null }));
        }
      });
    return () => { cancelled = true; };
  }, [currentProjectPath, setProjectState]);

  // Refresh app status for this project
  React.useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/app-status?repo=${repoName}`);
        const data = await res.json();
        if (cancelled) return;
        setProjectState(prev => ({
          ...prev,
          isAppRunning: data.isRunning,
          isAppManaged: data.isManaged,
          appPid: data.pid || null,
          logStreamPid: data.isManaged && data.pid && !prev.logStreamPid ? data.pid : prev.logStreamPid
        }));
      } catch {}
    };

    checkStatus();
    const handleFocus = () => checkStatus();
    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [repoName, setProjectState]);

  // Stream logs for this project
  React.useEffect(() => {
    if (!logStreamPid) return;
    let cancelled = false;
    let hasLoggedRecently = false;
    let startTimeoutId: number | null = null;

    const streamLogs = async () => {
      const ac = new AbortController();
      setProjectState(prev => ({ ...prev, appLogsAbortController: ac }));
      try {
        const res = await fetch(`/api/app-logs?pid=${logStreamPid}`, { signal: ac.signal });
        if (!res.ok || !res.body) {
          setProjectState(prev => ({ ...prev, appLogs: prev.appLogs + "\x1b[31mError: Failed to stream logs\x1b[0m\n", isAppStarting: false }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        
        startTimeoutId = window.setTimeout(() => { if (!hasLoggedRecently) setProjectState(prev => ({ ...prev, isAppStarting: false })); }, 2000);

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
                  setProjectState(prev => ({ ...prev, appLogs: prev.appLogs + data.output, isAppStarting: !currentProjectConfig?.url && data.output ? false : prev.isAppStarting }));
                  hasLoggedRecently = true;
                }
              } catch {
                setProjectState(prev => ({ ...prev, appLogs: prev.appLogs + line + "\n", isAppStarting: !currentProjectConfig?.url ? false : prev.isAppStarting }));
                hasLoggedRecently = true;
              }
            }
          }
        }
        setProjectState(prev => ({ ...prev, isAppStarting: false }));
      } catch (error: any) {
        if (error.name !== "AbortError" && !cancelled) {
          setProjectState(prev => ({ ...prev, appLogs: prev.appLogs + `\x1b[31mLog streaming error: ${error.message}\x1b[0m\n`, isAppStarting: false }));
        }
      }
    };
    streamLogs();

    return () => {
      cancelled = true;
      if (startTimeoutId !== null) window.clearTimeout(startTimeoutId);
    };
  }, [logStreamPid, repoName, currentProjectConfig?.url, setProjectState]);

  return (
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
        <BrowserTab repoName={repoName} />
      ) : (
        <TasksTab />
      )}
    </div>
  );
}