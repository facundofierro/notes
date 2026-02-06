import * as React from "react";
import FileBrowser from "@/components/FileBrowser";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

interface DocsTabProps {
  selectedRepo: string | null;
  currentPath: string;
  basePath: string;
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
    onRefresh?: () => void;
  }) => React.ReactNode;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onBack: () => void;
  onSelectedFileChange: (file: { path: string; content: string } | null) => void;
}

export function DocsTab({
  selectedRepo,
  currentPath,
  basePath,
  selectedFile,
  renderWorkEditor,
  onFileSelect,
  onBack,
  onSelectedFileChange,
}: DocsTabProps) {
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
      ext &&
      newTitle.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
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
    if (!res.ok)
      throw new Error(data.error || "Failed to rename file");
    const next = { path: data.path, content: selectedFile.content };
    onSelectedFileChange(next);
    loadFileTree();
    return next;
  };

  return (
    <>
      <FileBrowser
        fileTree={fileTree}
        currentPath={currentPath}
        onFileSelect={onFileSelect}
        basePath={basePath}
        onRefresh={loadFileTree}
        viewMode="docs"
      />
      <div className="flex overflow-hidden flex-1 bg-background">
        {selectedFile ? (
          renderWorkEditor({
            onBack,
            onRename: handleRename,
            onRefresh: loadFileTree,
          })
        ) : (
          <div className="flex flex-1 justify-center items-center text-muted-foreground">
            Select a file to view and
            edit
          </div>
        )}
      </div>
    </>
  );
}
