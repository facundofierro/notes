import * as React from "react";
import IdeasKanban from "@/components/IdeasKanban";
import { WorkEditorTab } from "@/components/WorkEditorTab";
import { HomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";

interface IdeasTabProps {
  state: HomeState;
  callbacks: ReturnType<typeof useHomeCallbacks>;
}

export function IdeasTab({ state, callbacks }: IdeasTabProps) {
  const { selectedRepo, selectedFile, setSelectedFile } = state;
  const { handleIdeaSelect, openWorkDraft } = callbacks;

  const onBack = () => setSelectedFile(null);

  const onRename = selectedRepo
    ? async (newTitle: string) => {
        const res = await fetch("/api/ideas", {
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
        if (!res.ok) throw new Error(data.error || "Failed to rename idea");
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
          state={state}
          callbacks={callbacks}
          onBack={onBack}
          onRename={onRename}
        />
      ) : selectedRepo ? (
        <IdeasKanban
          repo={selectedRepo}
          onIdeaSelect={handleIdeaSelect}
          onCreateIdea={({ state: s }) => openWorkDraft({ kind: "idea", state: s })}
        />
      ) : null}
    </div>
  );
}
