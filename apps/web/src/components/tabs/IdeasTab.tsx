import * as React from "react";
import IdeasKanban from "@/components/IdeasKanban";

interface IdeasTabProps {
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
  onIdeaSelect: (idea: any) => void;
  onCreateIdea: (opts: {
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

export function IdeasTab({
  selectedRepo,
  selectedFile,
  renderWorkEditor,
  onIdeaSelect,
  onCreateIdea,
  onBack,
  onRename,
}: IdeasTabProps) {
  return (
    <div className="flex-1 bg-background">
      {selectedFile ? (
        renderWorkEditor({
          onBack,
          onRename,
        })
      ) : selectedRepo ? (
        <IdeasKanban
          repo={selectedRepo}
          onIdeaSelect={onIdeaSelect}
          onCreateIdea={onCreateIdea}
        />
      ) : null}
    </div>
  );
}
