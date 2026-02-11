import React from "react";
import { PanelProps } from "./types";
import { Zap } from "lucide-react";

export function PerformancePanel(props: PanelProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-4">
      <Zap className="w-8 h-8 mb-2 opacity-20" />
      <p className="text-sm font-medium">Performance (LCP)</p>
      <p className="text-xs text-center mt-1">
        Analyze Largest Contentful Paint and other metrics.
      </p>
    </div>
  );
}
