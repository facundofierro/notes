import * as React from "react";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

interface ReviewTabProps {
  currentPath: string;
  basePath: string;
  selectedFile: {
    path: string;
    content: string;
  } | null;
  selectedRepo: string | null;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onSelectedFileChange: (file: { path: string; content: string } | null) => void;
}

export function ReviewTab({
  currentPath,
  basePath,
  selectedFile,
  selectedRepo,
  onFileSelect,
  onSelectedFileChange,
}: ReviewTabProps) {
  const [fileTree, setFileTree] = React.useState<FileNode | null>(null);

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}&path=work/review`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
        });
    }
  }, [selectedRepo]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  const handleSaveFile = async ({ content }: { content: string }) => {
    if (!selectedRepo || !selectedFile) return;
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: selectedRepo,
        path: selectedFile.path,
        content,
      }),
    });
    if (!res.ok) throw new Error("Failed to save file");
    onSelectedFileChange({ ...selectedFile, content });
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      <FileBrowser
        fileTree={fileTree}
        onFileSelect={onFileSelect}
        currentPath={currentPath}
        basePath={basePath}
        onRefresh={loadFileTree}
      />
      {selectedFile ? (
        <div className="flex relative flex-1 min-w-0">
          <FileViewer
            file={selectedFile}
            onSave={handleSaveFile}
            onFileSaved={loadFileTree}
          />
        </div>
      ) : (
        <div className="flex flex-1 justify-center items-center text-muted-foreground">
          Select a file to view and edit
        </div>
      )}
    </div>
  );
}
