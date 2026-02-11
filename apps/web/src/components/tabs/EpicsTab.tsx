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

  const isDraft = tabs?.epics?.workDocIsDraft;

  const onRename = selectedRepo
    ? async (newTitle: string) => {
        if (isDraft && selectedFile) {
           const oldPath = selectedFile.path;
           const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
           // Simple sanitization for draft filename
           const safeName = newTitle.trim().replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-');
           const newPath = `${dir}/${safeName || 'untitled'}.md`;
           
           // Update content
           let newContent = selectedFile.content;
           const headingRegex = /^#\s+(.+)$/m;
           if (headingRegex.test(newContent)) {
             newContent = newContent.replace(headingRegex, `# ${newTitle}`);
           } else {
             newContent = newContent + `\n\n# ${newTitle}`;
           }

           const next = {
             path: newPath,
             content: newContent
           };
           setTabFile("epics", next);
           return next;
        }

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
