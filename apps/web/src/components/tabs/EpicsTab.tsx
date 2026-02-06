import * as React from "react";
import EpicsKanban from "@/components/EpicsKanban";

interface EpicsTabProps {
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
  onEpicSelect: (epic: any) => void;
  onCreateEpic: (opts: {
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

export function EpicsTab({
  selectedRepo,
  selectedFile,
  renderWorkEditor,
  onEpicSelect,
  onCreateEpic,
  onBack,
  onRename,
}: EpicsTabProps) {
  return (
    <div className="flex-1 bg-background">
      {selectedFile ? (
        renderWorkEditor({
          onBack,
          onRename,
        })
      ) : selectedRepo ? (
        <EpicsKanban
          repo={selectedRepo}
          onEpicSelect={onEpicSelect}
          onCreateEpic={onCreateEpic}
        />
      ) : null}
    </div>
  );
}
