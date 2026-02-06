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
  fileTree: FileNode | null;
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
  onRefresh: () => void;
  onSaveFile: (opts: {
    content: string;
  }) => Promise<void>;
}

export function ReviewTab({
  fileTree,
  currentPath,
  basePath,
  selectedFile,
  selectedRepo,
  onFileSelect,
  onRefresh,
  onSaveFile,
}: ReviewTabProps) {
  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      <FileBrowser
        fileTree={fileTree}
        onFileSelect={onFileSelect}
        currentPath={currentPath}
        basePath={basePath}
        onRefresh={onRefresh}
      />
      {selectedFile ? (
        <div className="flex relative flex-1 min-w-0">
          <FileViewer
            file={selectedFile}
            onSave={onSaveFile}
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
