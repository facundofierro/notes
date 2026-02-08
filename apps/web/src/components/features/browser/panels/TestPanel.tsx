import React from "react";
import { PanelProps } from "./types";
import { FileCode } from "lucide-react";

export function TestPanel(props: PanelProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-4">
      <FileCode className="w-8 h-8 mb-2 opacity-20" />
      <p className="text-sm font-medium">Create Test</p>
      <p className="text-xs text-center mt-1">Generate automated tests for the current page.</p>
    </div>
  );
}
