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
  const repositories = useHomeStore((s) => s.repositories);
  const selectedRepo = useHomeStore((s) => s.selectedRepo);
  const updateTerminalSession = useHomeStore((s) => s.updateTerminalSession);
  const basePath = useHomeStore((s) => s.basePath);
  const agentTools = useHomeStore((s) => s.agentTools);
  const getProjectState = useHomeStore((s) => s.getProjectState);
  const [fileContent, setFileContent] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  const findTaskPath = React.useCallback(async (oldPath: string) => {
    // Only search if it looks like a task path
    if (!oldPath.includes("/tasks/")) return null;

    const fileName = oldPath.split("/").pop() || "";
    if (!fileName) return null;

    const repoName = session.projectName || selectedRepo;
    if (!repoName) return null;

    // Remove any existing timestamp prefix from the filename to get the base task name
    // Prefix format: YY_MM_DD-HHMMSS- (e.g., 23_02_12-102030-)
    const taskBaseName = fileName.replace(/^\d{2}_\d{2}_\d{2}-\d{6}-/, "");

    try {
      // Use the search API to find files with the base name
      const res = await fetch(
        `/api/files/search?repo=${encodeURIComponent(repoName)}&query=${encodeURIComponent(taskBaseName)}&includeCommon=true`
      );
      if (!res.ok) return null;

      const data = await res.json();
      const results = (data.results || []) as { path: string; name: string }[];

      // Look for a match in the tasks directory
      const match = results.find((r) => {
        // Must be in a tasks directory
        if (!r.path.includes("/tasks/")) return false;
        
        // Check if the filename (after stripping our prefix logic) matches
        const rFileName = r.name;
        const rBaseName = rFileName.replace(/^\d{2}_\d{2}_\d{2}-\d{6}-/, "");
        
        return rBaseName === taskBaseName;
      });

      if (match) {
        // Resolve absolute path
        const repo = repositories.find((r) => r.name === repoName);
        if (repo) {
          // Normalize path: match.path is relative to repo root
          return `${repo.path}/${match.path}`;
        }
      }
    } catch (err) {
      console.error("Error searching for moved task:", err);
    }
    return null;
  }, [session.projectName, selectedRepo, repositories]);

  React.useEffect(() => {
    if (!session.filePath) {
      setFileContent(null);
      return;
    }

    const loadContent = async (path: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error("Failed to load file");
        const data = await res.json();
        
        // If content is empty, verify if it actually exists (API returns {content: ""} for non-existent files)
        if (data.content === "") {
          const statsRes = await fetch(`/api/file?path=${encodeURIComponent(path)}&statsOnly=true`);
          const statsData = await statsRes.json();
          if (!statsData.exists) {
            // File doesn't exist, try to find it
            const newPath = await findTaskPath(path);
            if (newPath && newPath !== path) {
              // Update session in store
              updateTerminalSession(session.processId, { filePath: newPath });
              // The effect will re-run automatically since session.filePath changed
              return;
            }
            throw new Error("File not found and could not be recovered");
          }
        }
        
        setFileContent(data.content);
        setError(null);
      } catch (err) {
        console.error("Failed to load session file:", err);
        setError("Failed to load associated file context");
        setFileContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent(session.filePath);
  }, [session.filePath, session.processId, findTaskPath, updateTerminalSession]);

  // Poll for file changes while session is running
  React.useEffect(() => {
    if (!session.filePath || !session.isRunning || isEditing) return;

    const isPollingRef = { current: false };

    const intervalId = setInterval(() => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      fetch(`/api/file?path=${encodeURIComponent(session.filePath!)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load file");
          return res.json();
        })
        .then((data) => {
          setFileContent((prev) => {
            if (prev === data.content) return prev;
            return data.content;
          });
        })
        .catch((err) => {
          console.error("Failed to poll session file:", err);
        })
        .finally(() => {
          isPollingRef.current = false;
        });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [session.filePath, session.isRunning, isEditing]);

  const projectPath = React.useMemo(() => {
    const repoName = session.projectName || selectedRepo;
    if (!repoName) return null;
    return repositories.find((r) => r.name === repoName)?.path || null;
  }, [session.projectName, selectedRepo, repositories]);

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
              .then((res) => res.json())
              .then((data) => setFileContent(data.content))
              .catch(console.error);
          }}
          viewMode={getProjectState().viewMode}
          selectedRepo={session.projectName || selectedRepo}
          basePath={basePath}
          projectPath={projectPath}
          agentTools={agentTools}
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
