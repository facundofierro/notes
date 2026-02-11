"use client";

import * as React from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { inferTestExecutionStatus } from "@/lib/test-output";

interface TestExecution {
  id: string;
  timestamp: string;
  status: "success" | "failure" | "running";
  output: string;
  duration?: string;
}

interface TestResultsProps {
  testPath: string;
  currentOutput?: string;
  isTestRunning?: boolean;
}

export function TestResults({
  testPath,
  currentOutput,
  isTestRunning,
}: TestResultsProps) {
  const [history, setHistory] = React.useState<TestExecution[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // In a real app, this would be fetched from an API or shared state
  // For now, we'll use the current execution and maybe some mock history

  React.useEffect(() => {
    if (isTestRunning && !selectedId) {
      setSelectedId("current");
    }
  }, [isTestRunning, selectedId]);

  const selectedExecution = React.useMemo(() => {
    if (selectedId === "current") {
      const status = inferTestExecutionStatus(currentOutput, isTestRunning);

      return {
        id: "current",
        timestamp: new Date().toISOString(),
        status,
        output: currentOutput || "",
      } as TestExecution;
    }
    return history.find((h) => h.id === selectedId);
  }, [selectedId, isTestRunning, currentOutput, history]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar: History List */}
      <div className="w-52 border-r border-border flex flex-col bg-background">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            Executions
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {isTestRunning || currentOutput ? (
            <button
              onClick={() => setSelectedId("current")}
              className={`w-full p-3 text-left border-b border-border transition-colors hover:bg-secondary ${
                selectedId === "current" ? "bg-secondary" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
                {inferTestExecutionStatus(currentOutput, isTestRunning) ===
                "running" ? (
                  <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                ) : inferTestExecutionStatus(currentOutput, isTestRunning) ===
                  "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : currentOutput ? (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="text-xs font-medium text-foreground truncate">
                Current Execution
              </div>
            </button>
          ) : null}

          {history.length === 0 && !isTestRunning && !currentOutput && (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No execution history yet.</p>
            </div>
          )}

          {history.map((exec) => (
            <button
              key={exec.id}
              onClick={() => setSelectedId(exec.id)}
              className={`w-full p-3 text-left border-b border-border transition-colors hover:bg-secondary ${
                selectedId === exec.id ? "bg-secondary" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(exec.timestamp).toLocaleTimeString()}
                </span>
                {exec.status === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
              </div>
              <div className="text-xs font-medium text-foreground truncate">
                {new Date(exec.timestamp).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Result Detail */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        {selectedExecution ? (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between bg-background">
              <div className="flex items-center gap-3">
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedExecution.status === "running"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : selectedExecution.status === "success"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {selectedExecution.status}
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(selectedExecution.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-accent rounded transition-colors">
                  <Terminal className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 font-mono text-xs overflow-auto text-foreground">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {selectedExecution.output || "Waiting for output..."}
                {selectedExecution.status === "running" && (
                  <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse align-middle ml-1" />
                )}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <Terminal className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-sm">Select an execution to view results.</p>
          </div>
        )}
      </div>
    </div>
  );
}
