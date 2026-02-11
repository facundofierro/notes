import * as React from "react";
import { cn, ScrollArea } from "@agelum/shadcn";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { TestExecutionSummary } from "./types";

const STATUS_CONFIG = {
  passed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Passed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    label: "Failed",
  },
  error: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Error",
  },
  running: {
    icon: Loader2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    label: "Running",
  },
};

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

interface ExecutionHistoryProps {
  executions: TestExecutionSummary[];
  loading?: boolean;
  onSelect: (executionId: string, testId: string) => void;
  selectedExecutionId?: string | null;
  className?: string;
  showTestName?: boolean;
}

export function ExecutionHistory({
  executions,
  loading,
  onSelect,
  selectedExecutionId,
  className,
  showTestName = false,
}: ExecutionHistoryProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-zinc-600",
          className,
        )}
      >
        <Clock className="w-5 h-5 mb-2 opacity-50" />
        <span className="text-xs">No executions yet</span>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="flex flex-col gap-1 p-2">
        {executions.map((exec) => {
          const config = STATUS_CONFIG[exec.status];
          const StatusIcon = config.icon;
          const isSelected = selectedExecutionId === exec.id;

          return (
            <button
              key={exec.id}
              onClick={() => onSelect(exec.id, exec.testId)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                isSelected
                  ? "bg-white/[0.06] border border-white/[0.08]"
                  : "hover:bg-white/[0.03] border border-transparent",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  config.bg,
                )}
              >
                <StatusIcon
                  className={cn(
                    "w-3.5 h-3.5",
                    config.color,
                    exec.status === "running" && "animate-spin",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                {showTestName && (
                  <div className="text-[11px] font-medium text-zinc-300 truncate">
                    {exec.testName}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium", config.color)}>
                    {config.label}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatDuration(exec.duration)}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600">
                  {formatTime(exec.startedAt)}
                </div>
              </div>
              {exec.screenshotCount > 0 && (
                <span className="text-[9px] text-zinc-600 bg-white/[0.03] px-1.5 py-0.5 rounded">
                  {exec.screenshotCount} img
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
