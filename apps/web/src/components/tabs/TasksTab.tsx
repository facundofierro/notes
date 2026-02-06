import * as React from "react";
import TaskKanban from "@/components/TaskKanban";

interface TasksTabProps {
  selectedRepo: string | null;
  selectedFile: {
    path: string;
    content: string;
  } | null;
  renderWorkEditor: (opts: {
    onBack: () => void;
    onRename?: (
      newTitle: string,
    ) => Promise<{
      path: string;
      content: string;
    } | void>;
  }) => React.ReactNode;
  onTaskSelect: (task: any) => void;
  onCreateTask: (opts: {
    state: string;
  }) => void;
  onBack: () => void;
  onRename?: (
    newTitle: string,
  ) => Promise<{
    path: string;
    content: string;
  } | void>;
}

export function TasksTab({
  selectedRepo,
  selectedFile,
  renderWorkEditor,
  onTaskSelect,
  onCreateTask,
  onBack,
  onRename,
}: TasksTabProps) {
  return (
    <div className="flex-1 bg-background">
      {selectedFile ? (
        renderWorkEditor({
          onBack,
          onRename,
        })
      ) : selectedRepo ? (
        <TaskKanban
          repo={selectedRepo}
          onTaskSelect={onTaskSelect}
          onCreateTask={onCreateTask}
        />
      ) : null}
    </div>
  );
}
