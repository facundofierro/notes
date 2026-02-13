"use client";

import * as React from "react";
import { cn, ScrollArea, Button } from "@agelum/shadcn";
import {
  X,
  Image as ImageIcon,
  Terminal,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ImageWithFallback } from "@/components/shared/ImageWithFallback";


interface ExecutionViewProps {
  executionId: string;
  testId: string;
  logs: string[];
  screenshots: string[];
  isRunning: boolean;
  onClose: () => void;
}

export function ExecutionView({
  executionId,
  testId,
  logs,
  screenshots,
  isRunning,
  onClose,
}: ExecutionViewProps) {
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const [selectedScreenshot, setSelectedScreenshot] = React.useState<
    string | null
  >(null);

  // Auto-scroll logs
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Detect status from logs
  const status = React.useMemo(() => {
    if (isRunning) return "running";
    const lastLog = logs[logs.length - 1] || "";
    if (lastLog.includes("exited with code 0")) return "passed";
    if (lastLog.includes("exited with code")) return "failed";
    try {
      const parsed = JSON.parse(lastLog);
      if (parsed.type === "exec_complete") return parsed.status;
    } catch {
      /* ignore */
    }
    return "unknown";
  }, [logs, isRunning]);

  const statusConfig: Record<
    string,
    { icon: React.ElementType; color: string; label: string }
  > = {
    running: { icon: Loader2, color: "text-blue-400", label: "Running" },
    passed: { icon: CheckCircle2, color: "text-emerald-400", label: "Passed" },
    failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
    unknown: { icon: Clock, color: "text-zinc-400", label: "Unknown" },
  };

  const config = statusConfig[status] || statusConfig.unknown;
  const StatusIcon = config.icon;

  // Filter display logs (exclude JSON metadata)
  const displayLogs = React.useMemo(() => {
    return logs.filter((line) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "exec_start" || parsed.type === "exec_complete")
          return false;
      } catch {
        /* not JSON, keep */
      }
      return true;
    });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <StatusIcon
            className={cn(
              "w-4 h-4",
              config.color,
              status === "running" && "animate-spin",
            )}
          />
          <div>
            <h3 className="text-sm font-medium text-zinc-200">Execution</h3>
            <span className="text-[10px] text-zinc-600 font-mono">
              {executionId}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="w-7 h-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05]"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Screenshots */}
        <div className="w-[45%] flex flex-col border-r border-white/[0.04]">
          <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-400">
              Screenshots
            </span>
            <span className="text-[10px] text-zinc-600 ml-auto">
              {screenshots.length}
            </span>
          </div>

          <ScrollArea className="flex-1">
            {screenshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                <ImageIcon className="w-5 h-5 mb-2 opacity-40" />
                <span className="text-xs">
                  {isRunning ? "Waiting for screenshots..." : "No screenshots"}
                </span>
              </div>
            ) : (
              <div className="p-3 grid grid-cols-1 gap-3">
                {screenshots.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedScreenshot(url)}
                    className={cn(
                      "rounded-xl overflow-hidden border transition-all duration-200",
                      selectedScreenshot === url
                        ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "border-white/[0.04] hover:border-white/[0.08]",
                    )}
                  >
                    <ImageWithFallback
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-full h-auto object-contain max-h-[200px] bg-black"
                    />

                    <div className="px-3 py-1.5 bg-white/[0.02] text-[10px] text-zinc-500">
                      Step {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Logs */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-400">
              Console Output
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 font-mono text-[11px] leading-relaxed text-green-400/80 whitespace-pre-wrap break-all min-h-full bg-black/30">
              {displayLogs.length > 0 ? (
                displayLogs.map((line, i) => (
                  <div
                    key={i}
                    className="hover:bg-white/[0.02] px-1 -mx-1 rounded"
                  >
                    {line}
                  </div>
                ))
              ) : (
                <span className="text-zinc-600">
                  {isRunning ? "Waiting for output..." : "No logs available."}
                </span>
              )}
              {isRunning && (
                <span className="inline-block w-2 h-4 bg-green-400/80 animate-pulse ml-0.5" />
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Selected screenshot overlay */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 shadow-lg"
            >
              <X className="w-4 h-4" />
            </Button>
            <ImageWithFallback
              src={selectedScreenshot}
              alt="Screenshot"
              className="max-w-full max-h-[85vh] rounded-xl border border-white/[0.08] shadow-2xl"
            />

          </div>
        </div>
      )}
    </div>
  );
}
