import * as React from "react";
import EpicsKanban from "@/components/features/kanban/EpicsKanban";
import { WorkEditorTab } from "@/components/features/work/WorkEditorTab";
import { useHomeStore } from "@/store/useHomeStore";

export function EpicsTab() {
  const store = useHomeStore();
  const { 
    selectedRepo, 
    setTabFile,
    handleEpicSelect,
    openWorkDraft
  } = store;

  const { tabs } = store.getProjectState();
  const selectedFile = tabs?.epics?.selectedFile;

  const onBack = () => setTabFile("epics", null);

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
        setTabFile("epics", next);
        return next;
      }
    : undefined;

  return (
    <div className="flex-1 bg-background">
      {selectedFile ? (
        <WorkEditorTab
          onBack={onBack}
          onRename={onRename}
          tabId="epics"
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
