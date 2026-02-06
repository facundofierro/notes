import * as React from "react";
import TaskKanban from "@/components/TaskKanban";
import { WorkEditorTab } from "@/components/WorkEditorTab";
import { useHomeStore } from "@/store/useHomeStore";

export function TasksTab() {
  const { 
    selectedRepo, 
    selectedFile, 
    setSelectedFile, 
    handleTaskSelect, 
    openWorkDraft 
  } = useHomeStore();

  const onBack = () => setSelectedFile(null);

  const onRename = selectedRepo
    ? async (newTitle: string) => {
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
        setSelectedFile(next);
        return next;
      }
    : undefined;

  return (
    <div className="flex-1 bg-background">
      {selectedFile ? (
        <WorkEditorTab
          onBack={onBack}
          onRename={onRename}
        />
      ) : selectedRepo ? (
        <TaskKanban
          repo={selectedRepo}
          onTaskSelect={handleTaskSelect}
          onCreateTask={({ state: s }) => openWorkDraft({ kind: "task", state: s })}
        />
      ) : null}
    </div>
  );
}