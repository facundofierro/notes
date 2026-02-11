"use client";

import * as React from "react";
import { WorkEditor } from "@/components/features/work/WorkEditor";
import { TerminalSessionInfo } from "@/store/useHomeStore";
import { useHomeStore } from "@/store/useHomeStore";
import { Loader2, Terminal } from "lucide-react";

interface AISessionViewerProps {
  session: TerminalSessionInfo;
  sidebarWidth?: string;
  sidebarWideWidth?: string;
}

export function AISessionViewer({ session, sidebarWidth, sidebarWideWidth }: AISessionViewerProps) {
  const store = useHomeStore();
  const [fileContent, setFileContent] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

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
      <div className="flex-1 overflow-hidden relative w-full h-full flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : session.filePath && fileContent !== null ? (
          <WorkEditor
            file={{ path: session.filePath, content: fileContent }}
            onFileChange={(newFile) => {
              if (newFile) setFileContent(newFile.content);
            }}
            onBack={() => {
              // Optional: maybe clear selection in parent?
            }}
            onRename={async () => Promise.resolve()}
            onRefresh={() => {
               // Re-fetch file content
               fetch(`/api/file?path=${encodeURIComponent(session.filePath!)}`)
                 .then(res => res.json())
                 .then(data => setFileContent(data.content))
                 .catch(console.error);
            }}
            viewMode="tasks"
            selectedRepo={session.projectName || store.selectedRepo}
            basePath={store.basePath}
            projectPath={null}
            agentTools={store.agentTools}
            workEditorEditing={isEditing}
            onWorkEditorEditingChange={setIsEditing}
            workDocIsDraft={false}
            testViewMode="code"
            onTestViewModeChange={() => {}}
            testOutput=""
            isTestRunning={false}
            onRunTest={() => {}}
            contextKey={session.contextKey}
            onSave={async ({ path, content }) => {
              await fetch("/api/file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path, content }),
              });
              setFileContent(content);
            }}
            sidebarWidth={sidebarWidth}
            sidebarWideWidth={sidebarWideWidth}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground w-full h-full">
            {error ? (
              <div className="text-red-400 text-sm">Error: {error}</div>
            ) : (
              <div className="text-sm">
                No file context associated with this session.
              </div>
            )}
          </div>
        )}
      </div>
  );
}
