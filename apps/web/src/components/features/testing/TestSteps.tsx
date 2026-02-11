"use client";

import * as React from "react";
import {
  Globe,
  MousePointer2,
  Search,
  Eye,
  Power,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

interface TestStep {
  type: "goto" | "act" | "extract" | "observe" | "init" | "close" | "other";
  instruction?: string;
  url?: string;
  line: number;
}

interface TestStepsProps {
  code: string;
}

export function TestSteps({ code }: TestStepsProps) {
  const steps = React.useMemo(() => {
    const foundSteps: TestStep[] = [];

    // Regex for Stagehand commands
    const patterns = [
      {
        type: "goto" as const,
        regex: /page\.goto\(\s*['"]([^'"]+)['"]\s*\)/g,
      },
      {
        type: "act" as const,
        regex: /page\.act\(\s*\{\s*instruction:\s*['"]([^'"]+)['"]/g,
      },
      {
        type: "extract" as const,
        regex: /page\.extract\(\s*\{\s*instruction:\s*['"]([^'"]+)['"]/g,
      },
      {
        type: "observe" as const,
        regex: /page\.observe\(\s*\{\s*instruction:\s*['"]([^'"]+)['"]/g,
      },
      {
        type: "init" as const,
        regex: /stagehand\.init\(\)/g,
      },
      {
        type: "close" as const,
        regex: /stagehand\.close\(\)/g,
      },
    ];

    patterns.forEach(({ type, regex }) => {
      let match;
      while ((match = regex.exec(code)) !== null) {
        // Find line number
        const offset = match.index;
        const line = code.substring(0, offset).split("\n").length;

        foundSteps.push({
          type,
          url: type === "goto" ? match[1] : undefined,
          instruction:
            type === "act" || type === "extract" || type === "observe"
              ? match[1]
              : undefined,
          line,
        });
      }
    });

    // Sort by line number
    return foundSteps.sort((a, b) => a.line - b.line);
  }, [code]);

  const getIcon = (type: TestStep["type"]) => {
    switch (type) {
      case "goto":
        return <Globe className="w-4 h-4 text-blue-400" />;
      case "act":
        return <MousePointer2 className="w-4 h-4 text-green-400" />;
      case "extract":
        return <Search className="w-4 h-4 text-purple-400" />;
      case "observe":
        return <Eye className="w-4 h-4 text-yellow-400" />;
      case "init":
        return <Power className="w-4 h-4 text-gray-400" />;
      case "close":
        return <Power className="w-4 h-4 text-gray-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLabel = (step: TestStep) => {
    switch (step.type) {
      case "goto":
        return `Navigate to ${step.url}`;
      case "act":
        return step.instruction || "Action";
      case "extract":
        return `Extract: ${step.instruction}`;
      case "observe":
        return `Observe: ${step.instruction}`;
      case "init":
        return "Initialize browser";
      case "close":
        return "Close browser";
      default:
        return "Command";
    }
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center py-12 h-full text-muted-foreground">
        <Search className="mb-4 w-12 h-12 opacity-20" />
        <p>No test steps detected in the code.</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Try adding page.act() or page.goto() commands.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 mx-auto max-w-2xl">
      <div className="space-y-6">
        {steps.map((step, i) => (
          <div key={i} className="relative">
            {i < steps.length - 1 && (
              <div className="absolute left-[18px] top-10 bottom-[-24px] w-0.5 bg-secondary" />
            )}
            <div className="flex gap-4 items-start group">
              <div className="flex z-10 flex-shrink-0 justify-center items-center w-9 h-9 rounded-full border transition-colors bg-secondary border-border group-hover:border-muted-foreground">
                {getIcon(step.type)}
              </div>
              <div className="flex-1 pt-1.5">
                <div className="flex gap-2 items-center mb-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    Step {i + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    L{step.line}
                  </span>
                </div>
                <div className="p-3 rounded-lg border transition-all cursor-default border-border bg-secondary/50 hover:bg-secondary hover:border-muted-foreground">
                  <p className="text-sm font-medium text-foreground">
                    {getLabel(step)}
                  </p>
                  {step.type === "goto" && step.url && (
                    <p className="mt-1 font-mono text-xs truncate text-blue-400/70">
                      {step.url}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
