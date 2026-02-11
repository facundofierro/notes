import * as React from "react";
import IdeasKanban from "@/components/features/kanban/IdeasKanban";
import { WorkEditorTab } from "@/components/features/work/WorkEditorTab";
import { useHomeStore } from "@/store/useHomeStore";

export function IdeasTab() {
  const store = useHomeStore();
  const { selectedRepo, setTabFile, handleIdeaSelect, openWorkDraft } = store;

  const { tabs } = store.getProjectState();
  const selectedFile = tabs?.ideas?.selectedFile;

  const onBack = () => setTabFile("ideas", null);

  const isDraft = tabs?.ideas?.workDocIsDraft;

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
            content: newContent,
          };
          setTabFile("ideas", next);
          return next;
        }

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
        setTabFile("ideas", next);
        return next;
      }
    : undefined;

  return (
    <div className="flex-1 bg-background">
      {selectedFile ? (
        <WorkEditorTab onBack={onBack} onRename={onRename} tabId="ideas" />
      ) : selectedRepo ? (
        <IdeasKanban
          repo={selectedRepo}
          onIdeaSelect={handleIdeaSelect}
          onCreateIdea={({ state: s }) =>
            openWorkDraft({ kind: "idea", state: s })
          }
        />
      ) : null}
    </div>
  );
}
