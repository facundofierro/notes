import * as React from "react";
import { cn } from "@agelum/shadcn";
import { Globe, MousePointer, Type, Clock, Camera, Brain, Eye, Monitor, ChevronRight } from "lucide-react";
import type { TestStep } from "./types";

const STEP_ICONS: Record<string, React.ElementType> = {
  open: Globe,
  click: MousePointer,
  type: Type,
  wait: Clock,
  screenshot: Camera,
  snapshot: Camera,
  prompt: Brain,
  verifyVisible: Eye,
  setViewport: Monitor,
};

function getStepLabel(step: TestStep): string {
  switch (step.action) {
    case "open": return step.url || "URL";
    case "click": return step.selector || "element";
    case "type": return step.text ? `"${step.text}"` : step.selector || "input";
    case "wait": return step.value || "...";
    case "prompt": return step.instruction || "AI action";
    case "screenshot": return step.name || "capture";
    case "snapshot": return "AI snapshot";
    case "verifyVisible": return step.selector || "element";
    case "setViewport": return `${step.width || 1280}×${step.height || 720}`;
    default: return step.action;
  }
}

interface TestStepVisualizerProps {
  steps: TestStep[];
  className?: string;
  compact?: boolean;
}

export function TestStepVisualizer({ steps, className, compact }: TestStepVisualizerProps) {
  if (steps.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-6 text-zinc-600 text-xs", className)}>
        No steps defined
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 overflow-x-auto py-1", className)}>
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.action] || ChevronRight;
          return (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-700 flex-shrink-0" />}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.04] flex-shrink-0">
                <Icon className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-400 whitespace-nowrap">{step.action}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {steps.map((step, i) => {
        const Icon = STEP_ICONS[step.action] || ChevronRight;
        return (
          <div key={i} className="flex items-stretch">
            {/* Connector line */}
            <div className="flex flex-col items-center w-8 flex-shrink-0">
              <div className={cn(
                "w-7 h-7 rounded-full border flex items-center justify-center z-10",
                "bg-white/[0.03] border-white/[0.08]"
              )}>
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-white/[0.06] min-h-[16px]" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-3 pl-3 min-w-0">
              <div className="text-[11px] font-medium text-zinc-300">{step.action}</div>
              <div className="text-[10px] text-zinc-500 truncate">{getStepLabel(step)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
