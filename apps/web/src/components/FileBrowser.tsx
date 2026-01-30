"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  MoreVertical,
  Play,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@agelum/shadcn";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

interface FileBrowserProps {
  fileTree: FileNode | null;
  currentPath: string;
  onFileSelect: (
    node: FileNode,
  ) => void;
  basePath: string;
  onRefresh?: () => void;
  onRunFolder?: (path: string) => void;
}

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_DEFAULT_WIDTH = 320;

function FileTreeNode({
  node,
  level = 0,
  onFileSelect,
  expandedPaths,
  toggleExpand,
  onDelete,
  onAddFile,
  onAddFolder,
  onRunFolder,
}: {
  node: FileNode;
  level: number;
  onFileSelect: (
    node: FileNode,
  ) => void;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  onDelete: (
    path: string,
    type: "file" | "directory",
  ) => void;
  onAddFile: (
    parentPath: string,
  ) => void;
  onAddFolder: (
    parentPath: string,
  ) => void;
  onRunFolder?: (path: string) => void;
}) {
  const [showMenu, setShowMenu] =
    useState(false);
  const isExpanded = expandedPaths.has(
    node.path,
  );
  const hasChildren =
    node.children &&
    node.children.length > 0;
  const isSelectable =
    node.type === "file" ||
    !hasChildren;

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-1 py-1 px-2 hover:bg-secondary rounded relative ${
          isSelectable
            ? "cursor-pointer"
            : "cursor-default"
        }`}
        style={{
          paddingLeft: `${level * 12 + 8}px`,
        }}
        onMouseEnter={() =>
          setShowMenu(true)
        }
        onMouseLeave={() =>
          setShowMenu(false)
        }
      >
        <div
          className="flex items-center gap-1 flex-1"
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.path);
            }
            if (node.type === "file") {
              onFileSelect(node);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
          {node.type === "directory" ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-400" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-400" />
            )
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm text-foreground">
            {node.name}
          </span>
        </div>
        {showMenu && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.type ===
              "directory" && (
              <>
                {onRunFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunFolder(
                        node.path,
                      );
                    }}
                    className="p-1 hover:bg-green-900 rounded"
                    title="Run all tests"
                  >
                    <Play className="w-3 h-3 text-green-400" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFile(
                      node.path,
                    );
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title="New file"
                >
                  <FilePlus className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFolder(
                      node.path,
                    );
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title="New folder"
                >
                  <FolderPlus className="w-3 h-3 text-muted-foreground" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  confirm(
                    `Delete ${node.name}?`,
                  )
                ) {
                  onDelete(
                    node.path,
                    node.type,
                  );
                }
              }}
              className="p-1 hover:bg-red-600 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map(
            (child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                onFileSelect={
                  onFileSelect
                }
                expandedPaths={
                  expandedPaths
                }
                toggleExpand={
                  toggleExpand
                }
                onDelete={onDelete}
                onAddFile={onAddFile}
                onAddFolder={
                  onAddFolder
                }
                onRunFolder={
                  onRunFolder
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function FileBrowser({
  fileTree,
  onFileSelect,
  onRefresh,
  onRunFolder,
}: FileBrowserProps) {
  const [
    expandedPaths,
    setExpandedPaths,
  ] = useState<Set<string>>(new Set());
  const [
    isAddFileDialogOpen,
    setIsAddFileDialogOpen,
  ] = useState(false);
  const [
    isAddFolderDialogOpen,
    setIsAddFolderDialogOpen,
  ] = useState(false);
  const [parentPath, setParentPath] =
    useState("");
  const [newFileName, setNewFileName] =
    useState("");
  const [
    newFolderName,
    setNewFolderName,
  ] = useState("");
  const [
    sidebarWidth,
    setSidebarWidth,
  ] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] =
    useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(
    SIDEBAR_DEFAULT_WIDTH,
  );

  useEffect(() => {
    if (!fileTree) return;

    const allPaths = new Set<string>();
    const collectPaths = (
      node: FileNode,
    ) => {
      if (node.type === "directory") {
        allPaths.add(node.path);
        node.children?.forEach(
          collectPaths,
        );
      }
    };
    collectPaths(fileTree);
    setExpandedPaths(allPaths);
  }, [fileTree]);

  const toggleExpand = (
    path: string,
  ) => {
    const newExpanded = new Set(
      expandedPaths,
    );
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current =
        sidebarWidth;
    },
    [sidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor =
      "col-resize";
    document.body.style.userSelect =
      "none";

    const handleMouseMove = (
      e: MouseEvent,
    ) => {
      const delta =
        e.clientX -
        resizeStartX.current;
      const newWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(
          SIDEBAR_MIN_WIDTH,
          resizeStartWidth.current +
            delta,
        ),
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove,
    );
    window.addEventListener(
      "mouseup",
      handleMouseUp,
    );
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect =
        "";
      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );
      window.removeEventListener(
        "mouseup",
        handleMouseUp,
      );
    };
  }, [isResizing]);

  const handleDelete = async (
    path: string,
    type: "file" | "directory",
  ) => {
    try {
      const response = await fetch(
        `/api/file?path=${encodeURIComponent(path)}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error(
        "Failed to delete:",
        error,
      );
    }
  };

  const handleAddFile = async (
    path: string,
  ) => {
    setParentPath(path);
    setNewFileName("");
    setIsAddFileDialogOpen(true);
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;

    const filePath = `${parentPath}/${newFileName.trim()}`;
    try {
      const response = await fetch(
        "/api/file",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path: filePath,
            content: "",
          }),
        },
      );

      if (response.ok && onRefresh) {
        onRefresh();
      }
      setIsAddFileDialogOpen(false);
      setNewFileName("");
    } catch (error) {
      console.error(
        "Failed to create file:",
        error,
      );
    }
  };

  const handleAddFolder = async (
    path: string,
  ) => {
    setParentPath(path);
    setNewFolderName("");
    setIsAddFolderDialogOpen(true);
  };

  const handleCreateFolder =
    async () => {
      if (!newFolderName.trim()) return;

      const folderPath = `${parentPath}/${newFolderName.trim()}`;
      try {
        const response = await fetch(
          "/api/file",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              path: `${folderPath}/.gitkeep`,
              content: "",
            }),
          },
        );

        if (response.ok && onRefresh) {
          onRefresh();
        }
        setIsAddFolderDialogOpen(false);
        setNewFolderName("");
      } catch (error) {
        console.error(
          "Failed to create folder:",
          error,
        );
      }
    };

  return (
    <>
      <div
        className="relative flex shrink-0 flex-col border-r border-border bg-background"
        style={{ width: sidebarWidth }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize select-none border-r border-transparent transition-colors hover:border-muted-foreground hover:bg-secondary active:bg-accent"
          onMouseDown={
            handleResizeStart
          }
        />
        <div className="flex-1 overflow-y-auto p-2">
          {fileTree ? (
            <FileTreeNode
              node={fileTree}
              level={0}
              onFileSelect={
                onFileSelect
              }
              expandedPaths={
                expandedPaths
              }
              toggleExpand={
                toggleExpand
              }
              onDelete={handleDelete}
              onAddFile={handleAddFile}
              onAddFolder={
                handleAddFolder
              }
              onRunFolder={onRunFolder}
            />
          ) : (
            <p className="text-sm text-muted-foreground p-2">
              No repository selected
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={isAddFileDialogOpen}
        onOpenChange={
          setIsAddFileDialogOpen
        }
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Create New File
            </DialogTitle>
            <DialogDescription>
              Add a new file to the
              directory
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file-name">
                File Name
              </Label>
              <Input
                id="file-name"
                placeholder="example.md"
                value={newFileName}
                onChange={(
                  e: React.ChangeEvent<HTMLInputElement>,
                ) =>
                  setNewFileName(
                    e.target.value,
                  )
                }
                onKeyDown={(
                  e: React.KeyboardEvent<HTMLInputElement>,
                ) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    handleCreateFile();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setIsAddFileDialogOpen(
                  false,
                )
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFile}
              disabled={
                !newFileName.trim()
              }
            >
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddFolderDialogOpen}
        onOpenChange={
          setIsAddFolderDialogOpen
        }
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Create New Folder
            </DialogTitle>
            <DialogDescription>
              Add a new folder to the
              directory
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">
                Folder Name
              </Label>
              <Input
                id="folder-name"
                placeholder="my-folder"
                value={newFolderName}
                onChange={(
                  e: React.ChangeEvent<HTMLInputElement>,
                ) =>
                  setNewFolderName(
                    e.target.value,
                  )
                }
                onKeyDown={(
                  e: React.KeyboardEvent<HTMLInputElement>,
                ) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    handleCreateFolder();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setIsAddFolderDialogOpen(
                  false,
                )
              }
            >
              Cancel
            </Button>
            <Button
              onClick={
                handleCreateFolder
              }
              disabled={
                !newFolderName.trim()
              }
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
