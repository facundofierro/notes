import * as React from "react";
import FileBrowser from "@/components/features/file-system/FileBrowser";
import { WorkEditorTab } from "@/components/features/work/WorkEditorTab";
import { useHomeStore } from "@/store/useHomeStore";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  isProject?: boolean;
  isContainer?: boolean;
}

export function DocsTab() {
  const store = useHomeStore();
  const { selectedRepo, basePath, setSelectedFile, handleFileSelect } = store;

  const { selectedFile, currentPath } = store.getProjectState();

  const [fileTree, setFileTree] = React.useState<FileNode | null>(null);

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}&path=doc/docs`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
        });
    }
  }, [selectedRepo]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  const handleRename = async (newTitle: string) => {
    if (!selectedFile) return;
    const oldPath = selectedFile.path;
    const dir = oldPath.split("/").slice(0, -1).join("/");
    const fileName = oldPath.split("/").pop() || "";
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
    const newPath =
      ext && newTitle.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
        ? `${dir}/${newTitle}`
        : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: oldPath,
        newPath: newPath,
        action: "rename",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to rename file");
    const next = { path: data.path, content: selectedFile.content };
    setSelectedFile(next);
    loadFileTree();
    return next;
  };

  const onBack = () => setSelectedFile(null);

  return (
    <>
      <FileBrowser
        fileTree={fileTree}
        currentPath={currentPath}
        onFileSelect={handleFileSelect}
        basePath={basePath}
        onRefresh={loadFileTree}
        viewMode="docs"
      />
      <div className="flex overflow-hidden flex-1 bg-background">
        {selectedFile ? (
          <WorkEditorTab
            onBack={onBack}
            onRename={handleRename}
            onRefresh={loadFileTree}
          />
        ) : (
          <div className="flex flex-1 justify-center items-center text-muted-foreground">
            Select a file to view and edit
          </div>
        )}
      </div>
    </>
  );
}
