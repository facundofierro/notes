import * as React from "react";
import EpicsKanban from "@/components/EpicsKanban";
import { WorkEditorTab } from "@/components/WorkEditorTab";
import { HomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";

interface EpicsTabProps {
  state: HomeState;
  callbacks: ReturnType<typeof useHomeCallbacks>;
}

export function EpicsTab({ state, callbacks }: EpicsTabProps) {
  const { selectedRepo, selectedFile, setSelectedFile } = state;
  const { handleEpicSelect, openWorkDraft } = callbacks;

  const onBack = () => setSelectedFile(null);

  const onRename = selectedRepo
    ? async (newTitle: string) => {
        const res = await fetch("/api/epics", {
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
        if (!res.ok) throw new Error(data.error || "Failed to rename epic");
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
        <EpicsKanban
          repo={selectedRepo}
          onEpicSelect={handleEpicSelect}
          onCreateEpic={({ state: s }) => openWorkDraft({ kind: "epic", state: s })}
        />
      ) : null}
    </div>
  );
}
