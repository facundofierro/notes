"use client";

import * as React from "react";
import { useHomeStore } from "@/store/useHomeStore";
import { AIRightSidebar } from "@/components/layout/AIRightSidebar";
import { formatDistanceToNow } from "date-fns";
import { AISessionViewer } from "@/components/features/ai/AISessionViewer";
import { TerminalSessionInfo } from "@/store/useHomeStore";
import { Clock, Zap } from "lucide-react";

export function AITab() {
  const store = useHomeStore();
  const {
    selectedRepo,
    setSelectedRepo,
    repositories,
    isRepositoriesLoading,
    handleStartApp,
    handleStopApp,
    agentTools,
    handleRunTest,
    setHistorySessions,
    historySessions,
  } = store;

  // Retrieve history on mount
  React.useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setHistorySessions(data.history);
        }
      })
      .catch((err) => console.error("Failed to load history:", err));
  }, [setHistorySessions]);

  // Merge active and history sessions
  const mergedSessions = React.useMemo(() => {
    const active = Object.values(store.projectStates).flatMap(
      (p) => p.terminalSessions || [],
    );
    const history = historySessions || [];

    const map = new Map<string, TerminalSessionInfo>();
    // Add history first
    history.forEach((s) => map.set(s.processId, s));
    // Overwrite with active (contains current isRunning state)
    active.forEach((s) => map.set(s.processId, s));

    return Array.from(map.values());
  }, [store.projectStates, historySessions]);

  const {
    viewMode,
    selectedFile,
    workDocIsDraft,
    testViewMode,
    testOutput,
    isTestRunning,
  } = store.getProjectState();

  const [selectedSessionId, setSelectedSessionId] = React.useState<
    string | null
  >(null);

  // Get last 20 sessions sorted by time, with active sessions first
  const sortedSessions = React.useMemo(() => {
    const sessions = [...mergedSessions]
      .sort((a, b) => {
        // Active sessions first
        if (a.isRunning && !b.isRunning) return -1;
        if (!a.isRunning && b.isRunning) return 1;
        // Then by time (newest first)
        return b.startedAt - a.startedAt;
      })
      .slice(0, 50); // Increased limit
    return sessions;
  }, [mergedSessions]);

  // Extract project name from context key (format: "ai-tab-projectName" or similar)
  const getProjectFromSession = (session: TerminalSessionInfo) => {
    return (
      session.projectName || session.contextKey.split("-").pop() || "Unknown"
    );
  };

  // Truncate prompt to show beginning
  const truncatePrompt = (prompt: string | undefined, maxLength = 60) => {
    if (!prompt) return "Interactive terminal session";
    return prompt.length > maxLength
      ? prompt.substring(0, maxLength) + "..."
      : prompt;
  };

  const selectedSession = React.useMemo(
    () => sortedSessions.find((s) => s.processId === selectedSessionId),
    [sortedSessions, selectedSessionId],
  );

  return (
    <div className="flex w-full h-full bg-background relative overflow-hidden">
      {/* Left Sidebar - Unified History */}
      <div className="w-[260px] border-r border-border flex flex-col bg-secondary/30">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm mb-1 text-foreground">
            AI Sessions
          </h2>
          <p className="text-[10px] text-muted-foreground">
            All projects • Last 20 sessions
          </p>
        </div>
        <div className="flex-1 overflow-auto">
          {sortedSessions.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center p-4 italic">
              No sessions yet. Start using AI tools to see history here.
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {sortedSessions.map((session) => {
                const projectName = getProjectFromSession(session);
                const isSelected = selectedSessionId === session.processId;

                return (
                  <button
                    key={session.processId}
                    onClick={() => {
                      setSelectedSessionId(session.processId);
                      // Set the selected repo to match the session's project
                      if (session.projectName) {
                        setSelectedRepo(session.projectName);
                      }
                    }}
                    className={`
                      flex flex-col gap-1.5 p-3 rounded-lg text-left transition-all
                      ${
                        isSelected
                          ? "bg-blue-900/20 border border-blue-600/50"
                          : "bg-secondary/50 border border-border hover:bg-secondary hover:border-border"
                      }
                      ${session.isRunning ? "ring-1 ring-green-500/50" : ""}
                    `}
                  >
                    {/* Header: Project + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-medium text-blue-400 truncate">
                          {projectName}
                        </span>
                        {session.isRunning && (
                          <Zap className="w-3 h-3 text-green-500 shrink-0 animate-pulse" />
                        )}
                      </div>
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>

                    {/* Tool Name */}
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {session.toolName}
                    </div>

                    {/* Prompt Preview */}
                    <div className="text-xs text-foreground/80 line-clamp-2 leading-tight">
                      {truncatePrompt(session.prompt)}
                    </div>

                    {/* Time */}
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(session.startedAt, {
                        addSuffix: true,
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - AI Tools (Wide Mode) */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {selectedSession &&
        (selectedSession.filePath || !selectedSession.isRunning) ? (
          <AISessionViewer session={selectedSession} sidebarWidth="50vw" />
        ) : selectedRepo ? (
          <AIRightSidebar
            selectedRepo={selectedRepo}
            basePath={store.basePath}
            projectPath={
              repositories.find((r) => r.name === selectedRepo)?.path
            }
            agentTools={agentTools}
            viewMode="ai"
            file={selectedFile}
            workDocIsDraft={workDocIsDraft}
            testViewMode={testViewMode}
            testOutput={testOutput}
            isTestRunning={isTestRunning}
            onRunTest={handleRunTest}
            className="w-full h-full border-0"
            contextKey={
              selectedSession && selectedSession.isRunning
                ? selectedSession.contextKey
                : `ai-tab-${selectedRepo}`
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col gap-3 text-muted-foreground">
            <div className="text-sm">Welcome to AI Hub</div>
            <div className="text-xs text-center max-w-md">
              {sortedSessions.length === 0
                ? "Start by selecting a project from another tab and running an AI tool"
                : "Select a session from the history to continue or start a new one"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
