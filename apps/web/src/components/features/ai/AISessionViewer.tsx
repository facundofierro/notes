"use client";

import * as React from "react";
import { WorkEditor } from "@/components/features/work/WorkEditor";
import { TerminalSessionInfo } from "@/store/useHomeStore";
import { useHomeStore } from "@/store/useHomeStore";
import { Loader2, Terminal } from "lucide-react";

interface AISessionViewerProps {
  session: TerminalSessionInfo;
}

export function AISessionViewer({ session }: AISessionViewerProps) {
  const store = useHomeStore();
  const [fileContent, setFileContent] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session.filePath) {
      setFileContent(null);
      return;
    }

    setIsLoading(true);
    fetch(`/api/file?path=${encodeURIComponent(session.filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file");
        return res.json();
      })
      .then((data) => {
        setFileContent(data.content);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load session file:", err);
        setError("Failed to load associated file");
        setFileContent(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [session.filePath]);

  return (
    <div className="flex flex-col w-full h-full bg-background relative overflow-hidden">
      {/* Top: Prompt View */}
      <div className="flex flex-col p-4 border-b border-border bg-secondary/10 min-h-[120px] max-h-[300px] overflow-auto shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Executed Prompt
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(session.startedAt).toLocaleString()}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm font-mono whitespace-pre-wrap text-foreground/90">
          {session.prompt || "(No prompt recorded)"}
        </div>
      </div>

      {/* Local State for WorkEditor */}
       {/* Why local state? WorkEditor manages its own state for sub-tabs, but requires some props. */}
       {/* We simulate a 'task' view mode to enable the Plan/Summary/Tests tabs */}

      {/* Bottom: content */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : session.filePath && fileContent !== null ? (
          <WorkEditor
            file={{ path: session.filePath, content: fileContent }}
            onFileChange={() => {}} 
            onBack={() => {}} 
            onRename={async () => Promise.resolve()}
            onRefresh={() => {}} 
            viewMode="tasks" 
            selectedRepo={session.projectName || store.selectedRepo}
            basePath={store.basePath}
            projectPath={null}
            agentTools={store.agentTools}
            workEditorEditing={false}
            onWorkEditorEditingChange={() => {}}
            workDocIsDraft={false}
            testViewMode="code"
            onTestViewModeChange={() => {}}
            testOutput=""
            isTestRunning={false}
            onRunTest={() => {}}
            contextKey={session.contextKey}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground w-full h-full">
            {error ? (
              <div className="text-red-400 text-sm">Error: {error}</div>
            ) : (
               <div className="text-sm">No file context associated with this session.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
