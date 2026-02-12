"use client";

import * as React from "react";
import {
  Play,
  Square,
  ScrollText,
  MoreVertical,
  RotateCw,
  Download,
  Hammer,
  Settings,
  LogIn,
} from "lucide-react";
import { AgelumNotesLogo } from "@agelum/shadcn";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { VIEW_MODE_CONFIG, ViewMode } from "@/lib/view-config";
import { useHomeStore } from "@/store/useHomeStore";

import { useGitStatusPoller } from "@/hooks/useGitStatus";

export function Header() {
  const store = useHomeStore();
  useGitStatusPoller();
  const {
    setViewMode,
    selectedRepo,
    setSelectedRepo,
    repositories,
    isRepositoriesLoading,
    handleStartApp,
    handleStopApp,
    handleRestartApp,
    handleBuildApp,
    setSettingsTab,
    setIsSettingsOpen,
    settings,
  } = store;

  // Defer persisted viewMode until after hydration to avoid SSR mismatch
  const [hasMounted, setHasMounted] = React.useState(false);

  // Terminal activity animation state
  const { viewMode, isAppRunning, isAppManaged, lastTerminalActivity } =
    store.getProjectState();
  const [isTerminalReceiving, setIsTerminalReceiving] = React.useState(false);

  React.useEffect(() => setHasMounted(true), []);
  const effectiveViewMode = hasMounted ? viewMode : "kanban";

  React.useEffect(() => {
    // If activity happened recently (e.g. less than 2s ago), show animation
    // We check purely based on timestamp update to trigger the effect
    if (lastTerminalActivity > 0) {
      setIsTerminalReceiving(true);
      const timer = setTimeout(() => setIsTerminalReceiving(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastTerminalActivity]);

  const [isAppActionsMenuOpen, setIsAppActionsMenuOpen] = React.useState(false);

  const visibleItems = React.useMemo(() => {
    const defaultItems: ViewMode[] = [
      "ai",
      "ideas",
      "docs",
      "separator",
      "epics",
      "kanban",
      "review",
      "tools",
      "separator",
      "logs",
      "browser",
      "tests",
    ];

    if (!selectedRepo || !settings.projects) return defaultItems;
    const project = settings.projects.find((p) => p.name === selectedRepo);
    const workflowId = project?.workflowId || settings.activeWorkflow;
    if (!workflowId) return defaultItems;
    const workflow = settings.workflows?.find((w) => w.id === workflowId);
    if (!workflow) return defaultItems;
    return workflow.items as ViewMode[];
  }, [selectedRepo, settings]);

  const handleInstallDeps = React.useCallback(async () => {
    if (!selectedRepo) return;

    // Switch to logs view
    store.setProjectState(() => ({
      viewMode: "logs",
    }));

    const projectState = store.getProjectState();
    const mainTerminal = projectState.terminals?.find((t) => t.id === "main");
    if (!mainTerminal?.processId) {
      console.error("Main terminal not found or has no process ID");
      return;
    }

    try {
      await fetch("/api/terminal", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: mainTerminal.processId,
          input: "pnpm install\n",
        }),
      });
    } catch (error) {
      console.error("Failed to send install command to terminal:", error);
    }
  }, [selectedRepo, store]);

  return (
    <div className="flex justify-between items-center px-4 py-2 border-b bg-secondary border-border">
      <div className="flex gap-6 items-center">
        <AgelumNotesLogo size="sm" />
        <div className="flex gap-1 items-center">
          {(() => {
            let sectionIndex = 0;
            return visibleItems.map((mode, index) => {
              if (mode === "separator") {
                sectionIndex++;
                return (
                  <div
                    key={`sep-${index}`}
                    className="w-px h-6 bg-border mx-1"
                  />
                );
              }
              const config = VIEW_MODE_CONFIG[mode];
              if (!config) return null;
              const Icon = config.icon;

              const isTerminalAndReceiving =
                mode === "logs" &&
                isTerminalReceiving &&
                effectiveViewMode !== "logs";

              let activeClass = "text-amber-500 bg-amber-500/10";
              let activityClass = "text-amber-400/80 bg-amber-500/5";
              let pingClass = "bg-amber-500";

              if (sectionIndex === 1) {
                activeClass = "text-blue-500 bg-blue-500/10";
                activityClass = "text-blue-400/80 bg-blue-500/5";
                pingClass = "bg-blue-500";
              } else if (sectionIndex === 2) {
                activeClass = "text-green-500 bg-green-500/10";
                activityClass = "text-green-400/80 bg-green-500/5";
                pingClass = "bg-green-500";
              }

              const { gitStatus } = store.getProjectState();
              const hasGitChanges =
                mode === "review" &&
                (gitStatus?.hasChanges ||
                  (gitStatus?.ahead || 0) > 0 ||
                  (gitStatus?.behind || 0) > 0);

              return (
                <button
                  key={`${mode}-${index}`}
                  onClick={() => setViewMode(mode as ViewMode)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors outline-none focus:outline-none ring-0 ${
                    effectiveViewMode === mode
                      ? activeClass
                      : isTerminalAndReceiving
                        ? `${activityClass} transition-all duration-300`
                        : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-4 h-4 ${isTerminalAndReceiving ? "animate-pulse" : ""}`}
                    />
                    {isTerminalAndReceiving && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${pingClass} rounded-full animate-ping`}
                      />
                    )}
                  </div>
                  {config.label}
                  {hasGitChanges && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-secondary shadow-[0_0_10px_rgba(59,130,246,0.6)] z-10" />
                  )}
                </button>
              );
            });
          })()}
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center rounded-full px-1.5 py-1 shadow-sm">
          <ProjectSelector
            repositories={repositories}
            selectedRepo={selectedRepo}
            onSelect={setSelectedRepo}
            isLoading={isRepositoriesLoading}
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
  );
}
