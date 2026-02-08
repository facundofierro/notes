import React from "react";
import { PanelProps } from "./types";
import { Network, Trash2, Globe } from "lucide-react";
import { useHomeStore } from "@/store/useHomeStore";
import { ScrollArea } from "@agelum/shadcn";

export function NetworkPanel({ repo }: PanelProps) {
  const projectState = useHomeStore(s => s.projectStates[repo]);
  const clearNetworkLogs = useHomeStore(s => s.clearNetworkLogs);
  
  const logs = projectState?.networkLogs || [];

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status?: number, method?: string) => {
    if (method === "BROWSER") return "text-amber-500";
    if (!status) return "text-muted-foreground";
    if (status >= 200 && status < 300) return "text-green-500";
    if (status >= 300 && status < 400) return "text-blue-500";
    if (status >= 400) return "text-red-500";
    return "text-muted-foreground";
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-4">
        <Network className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm font-medium">No network activity</p>
        <p className="text-xs text-center mt-1">
          Perform actions in the browser to see requests.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Network Logs ({logs.length})
          </span>
        </div>
        <button
          onClick={clearNetworkLogs}
          className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
          title="Clear logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full divide-y divide-border table-fixed">
            <thead className="bg-secondary/10 sticky top-0 z-10">
              <tr className="text-[10px] text-muted-foreground uppercase text-left">
                <th className="px-3 py-2 font-medium w-16">Method</th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium w-16">Status</th>
                <th className="px-3 py-2 font-medium w-20">Type</th>
                <th className="px-3 py-2 font-medium w-20 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...logs].reverse().map((log) => (
                <tr
                  key={log.requestId}
                  className="text-[11px] hover:bg-accent/50 transition-colors group"
                >
                  <td className="px-3 py-1.5 font-mono font-bold text-muted-foreground">
                    <span className={log.method === "BROWSER" ? "text-amber-500" : ""}>{log.method}</span>
                  </td>
                  <td className="px-3 py-1.5 truncate relative" title={log.url}>
                    <div className="flex items-center gap-1.5">
                      <Globe className={`w-3 h-3 shrink-0 ${log.method === "BROWSER" ? "text-amber-500" : "text-muted-foreground"}`} />
                      <span className={`truncate ${log.method === "BROWSER" ? "text-amber-500 font-medium" : ""}`}>{log.url}</span>
                    </div>
                  </td>
                  <td className={`px-3 py-1.5 font-mono ${getStatusColor(log.status, log.method)}`}>
                    {log.status || (log.finished ? "Fail" : "...")}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground truncate">
                    {log.type || "-"}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-right font-mono">
                    {formatSize(log.size)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}