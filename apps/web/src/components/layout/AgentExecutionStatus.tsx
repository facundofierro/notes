"use client";

import { useState } from "react";
import { Badge, Progress } from "@agelum/shadcn";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@agelum/shadcn";

export type ExecutionStatus = "idle" | "executing" | "success" | "error";

interface AgentExecutionStatusProps {
  status: ExecutionStatus;
  output?: string;
  error?: string;
  progress?: number;
  className?: string;
}

export function AgentExecutionStatus({
  status,
  output,
  error,
  progress,
  className,
}: AgentExecutionStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    idle: {
      label: "Ready",
      variant: "secondary" as const,
      icon: null,
    },
    executing: {
      label: "Executing",
      variant: "default" as const,
      icon: Loader2,
    },
    success: {
      label: "Complete",
      variant: "default" as const,
      icon: CheckCircle2,
    },
    error: {
      label: "Error",
      variant: "destructive" as const,
      icon: XCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const hasOutput =
    (output && output.trim().length > 0) || (error && error.trim().length > 0);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="gap-1.5">
            {Icon && (
              <Icon
                className={cn(
                  "h-3 w-3",
                  status === "executing" && "animate-spin",
                )}
              />
            )}
            {config.label}
          </Badge>
          {status === "executing" && progress !== undefined && (
            <div className="w-32">
              <Progress value={progress} />
            </div>
          )}
        </div>
        {hasOutput && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide output
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show output
              </>
            )}
          </button>
        )}
      </div>

      {isExpanded && hasOutput && (
        <div className="rounded-md border bg-muted/50 p-3">
          {error && (
            <div className="mb-2">
              <div className="mb-1 text-sm font-semibold text-destructive">
                Error:
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-destructive">
                {error}
              </pre>
            </div>
          )}
          {output && (
            <div>
              {error && (
                <div className="mb-1 text-sm font-semibold">Output:</div>
              )}
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
