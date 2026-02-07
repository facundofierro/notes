import React from "react";
import { PanelProps } from "./types";
import { Network } from "lucide-react";

export function NetworkPanel(props: PanelProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-4">
      <Network className="w-8 h-8 mb-2 opacity-20" />
      <p className="text-sm font-medium">Network Logs</p>
      <p className="text-xs text-center mt-1">Monitor network requests and responses.</p>
    </div>
  );
}
