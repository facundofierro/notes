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
  fileTree: FileNode | null;
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
  }) => React.ReactNode;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onRefresh: () => void;
  onBack: () => void;
  onRename?: (
    newTitle: string,
  ) => Promise<{
    path: string;
    content: string;
  } | void>;
}

export function DocsTab({
  fileTree,
  currentPath,
  basePath,
  selectedFile,
  renderWorkEditor,
  onFileSelect,
  onRefresh,
  onBack,
  onRename,
}: DocsTabProps) {
  return (
    <>
      <FileBrowser
        fileTree={fileTree}
        currentPath={currentPath}
        onFileSelect={onFileSelect}
        basePath={basePath}
        onRefresh={onRefresh}
        viewMode="docs"
      />
      <div className="flex overflow-hidden flex-1 bg-background">
        {selectedFile ? (
          renderWorkEditor({
            onBack,
            onRename,
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
