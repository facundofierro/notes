"use client";

import * as React from "react";
import { 
  Play, 
  Square, 
  Terminal, 
  ScrollText, 
  MoreVertical, 
  RotateCw, 
  Download, 
  Hammer, 
  Settings, 
  LogIn 
} from "lucide-react";
import { AgelumNotesLogo } from "@agelum/shadcn";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { VIEW_MODE_CONFIG, ViewMode } from "@/lib/view-config";
import { useHomeStore } from "@/store/useHomeStore";

export function Header() {
  const store = useHomeStore();
  const {
    setViewMode,
    selectedRepo,
    setSelectedRepo,
    repositories,
    handleStartApp,
    handleStopApp,
    handleRestartApp,
    handleBuildApp,
    setSettingsTab,
    setIsSettingsOpen,
    settings
  } = store;

  const { viewMode, isAppRunning, isAppManaged } = store.getProjectState();

  // Defer persisted viewMode until after hydration to avoid SSR mismatch
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => setHasMounted(true), []);
  const effectiveViewMode = hasMounted ? viewMode : "kanban";

  const [isAppActionsMenuOpen, setIsAppActionsMenuOpen] = React.useState(false);

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
    return workflow.items as ViewMode[];
  }, [selectedRepo, settings]);

  const handleInstallDeps = React.useCallback(async () => {
    if (!selectedRepo) return;
    await fetch("/api/system/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: selectedRepo, command: "pnpm install" }),
    });
  }, [selectedRepo]);

  return (
    <div className="flex justify-between items-center px-4 py-2 border-b bg-secondary border-border">
      <div className="flex gap-6 items-center">
        <AgelumNotesLogo size="sm" />
        <div className="flex gap-1 items-center">
          {visibleItems.map((mode, index) => {
            if (mode === "separator") return <div key={`sep-${index}`} className="w-px h-6 bg-border mx-1" />;
            const config = VIEW_MODE_CONFIG[mode];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <button
                key={`${mode}-${index}`}
                onClick={() => setViewMode(mode as ViewMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors outline-none focus:outline-none ring-0 ${ 
                  effectiveViewMode === mode ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-accent" 
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center rounded-full px-1.5 py-1 shadow-sm">
          <ProjectSelector 
            repositories={repositories} 
            selectedRepo={selectedRepo} 
            onSelect={setSelectedRepo} 
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
                onClick={() => { /* Terminal logic can be added to store if needed */ }} 
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors" 
                title="Open Terminal"
              >
                <Terminal className="w-4 h-4" />
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
                      onClick={() => { handleRestartApp(); setIsAppActionsMenuOpen(false); }} 
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <RotateCw className="w-4 h-4" />Restart
                    </button>
                  )}
                  <button 
                    onClick={() => { handleInstallDeps(); setIsAppActionsMenuOpen(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Download className="w-4 h-4" />Install
                  </button>
                  <button 
                    onClick={() => { handleBuildApp(); setIsAppActionsMenuOpen(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Hammer className="w-4 h-4" />Build
                  </button>
                  <div className="my-1 mx-2 h-px bg-border" />
                  <button 
                    onClick={() => { setSettingsTab("project-config"); setIsSettingsOpen(true); setIsAppActionsMenuOpen(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Settings className="w-4 h-4" />Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setSettingsTab("defaults"); setIsSettingsOpen(true); }} 
          className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-white hover:bg-accent" 
          title="General Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-white hover:bg-accent rounded-lg text-sm transition-colors">
          <LogIn className="w-4 h-4" />Login
        </button>
      </div>
    </div>
  );
}
