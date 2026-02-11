import React, { useState } from "react";
import { CheckCircle2, FileCode, Network, Terminal, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@agelum/shadcn";
import { PanelProps, PanelDefinition } from "./types";
import { TaskPanel } from "./TaskPanel";
import { TestPanel } from "./TestPanel";
import { NetworkPanel } from "./NetworkPanel";
import { ConsolePanel } from "./ConsolePanel";
import { PerformancePanel } from "./PerformancePanel";

const PANELS: PanelDefinition[] = [
  {
    id: "task",
    title: "Create Task",
    icon: CheckCircle2,
    component: TaskPanel,
  },
  {
    id: "test",
    title: "Create Test",
    icon: FileCode,
    component: TestPanel,
  },
  {
    id: "network",
    title: "Network Logs",
    icon: Network,
    component: NetworkPanel,
  },
  {
    id: "console",
    title: "Console Logs",
    icon: Terminal,
    component: ConsolePanel,
  },
  {
    id: "performance",
    title: "Performance (LCP)",
    icon: Zap,
    component: PerformancePanel,
  },
];

export function BrowserRightPanel(props: PanelProps) {
  const [activePanelId, setActivePanelId] = useState("task");

  const activePanel = PANELS.find((p) => p.id === activePanelId) || PANELS[0];
  const ActivePanelComponent = activePanel.component;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full bg-background border-l border-border w-[350px]">
        {/* Top Icon Bar */}
        <div className="flex items-center justify-around py-2 border-b border-border bg-secondary/5">
          {PANELS.map((panel) => {
            const Icon = panel.icon;
            const isActive = activePanelId === panel.id;
            return (
              <Tooltip key={panel.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActivePanelId(panel.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-[11px]">{panel.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ActivePanelComponent {...props} />
        </div>
      </div>
    </TooltipProvider>
  );
}
