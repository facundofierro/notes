import * as React from "react";
import TaskKanban from "@/components/features/kanban/TaskKanban";
import { WorkEditorTab } from "@/components/features/work/WorkEditorTab";
import { useHomeStore } from "@/store/useHomeStore";

export function TasksTab() {
  const store = useHomeStore();
  const { selectedRepo, setTabFile, handleTaskSelect, openWorkDraft } = store;

  const { tabs } = store.getProjectState();
  const selectedFile = tabs?.tasks?.selectedFile;

  const onBack = () => setTabFile("tasks", null);

  const isDraft = tabs?.tasks?.workDocIsDraft;

  const onRename = selectedRepo
    ? async (newTitle: string) => {
        if (isDraft && selectedFile) {
          const oldPath = selectedFile.path;
          const dir = oldPath.substring(0, oldPath.lastIndexOf("/"));
          // Simple sanitization for draft filename
          const safeName = newTitle
            .trim()
            .replace(/[^a-zA-Z0-9-_\s]/g, "")
            .replace(/\s+/g, "-");
          const newPath = `${dir}/${safeName || "untitled"}.md`;

          // Update content: replace first H1 or add it
          let newContent = selectedFile.content;
          const headingRegex = /^#\s+(.+)$/m;
          if (headingRegex.test(newContent)) {
            newContent = newContent.replace(headingRegex, `# ${newTitle}`);
          } else {
            newContent = newContent + `\n\n# ${newTitle}`;
          }

          const next = {
            path: newPath,
            content: newContent,
          };
          setTabFile("tasks", next);
          return next;
        }

        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo: selectedRepo,
            action: "rename",
            path: selectedFile!.path,
            newTitle,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to rename task");
        const next = {
          path: data.path as string,
          content: data.content as string,
        };
        setTabFile("tasks", next);
        return next;
      }
    : undefined;

  return (
    <div className="flex flex-col flex-1 bg-background min-w-0">
      {selectedFile ? (
        <WorkEditorTab onBack={onBack} onRename={onRename} tabId="tasks" />
      ) : (
        selectedRepo && (
          <TaskKanban
            repo={selectedRepo}
            onTaskSelect={handleTaskSelect}
            onCreateTask={({ state: s }) =>
              openWorkDraft({ kind: "task", state: s })
            }
          />
        )
      )}
    </div>
  );
}
