import React from "react";
import { PanelProps } from "./types";
import { Terminal } from "lucide-react";

export function ConsolePanel(props: PanelProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-4">
      <Terminal className="w-8 h-8 mb-2 opacity-20" />
      <p className="text-sm font-medium">Console Logs</p>
      <p className="text-xs text-center mt-1">View browser console output and errors.</p>
    </div>
  );
}
