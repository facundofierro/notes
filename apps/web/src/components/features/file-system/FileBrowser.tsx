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
  Play,
  Copy,
} from "lucide-react";
import { useToast } from "@agelum/shadcn";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  size?: number;
}

interface FileBrowserProps {
  fileTree: FileNode | null;
  currentPath: string;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onFolderSelect?: (node: FileNode) => void;
  basePath: string;
  onRefresh?: () => void;
  onRunFolder?: (path: string) => void;
  viewMode?: string;
  resizable?: boolean;
}

const SIDEBAR_MIN_WIDTH = 150;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_DEFAULT_WIDTH = 240;

function FileTreeNode({
  node,
  level = 0,
  onFileSelect,
  onFolderSelect,
  expandedPaths,
  toggleExpand,
  onDelete,
  onAddFile,
  onAddFolder,
  onRunFolder,
  newItem,
  newItemName,
  setNewItemName,
  onCancelNewItem,
  onSaveNewItem,
  onCopyPath,
}: {
  node: FileNode;
  level: number;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onFolderSelect?: (node: FileNode) => void;
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
  newItem: {
    parentPath: string;
    type: "file" | "directory";
  } | null;
  newItemName: string;
  setNewItemName: (
    name: string,
  ) => void;
  onCancelNewItem: () => void;
  onSaveNewItem: () => void;
  onCopyPath: (path: string) => void;
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
          className="flex flex-1 gap-1 items-center"
          onClick={() => {
            if (node.type === "directory" && hasChildren) {
              toggleExpand(node.path);
            } else if (node.type === "file") {
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
          <div className="flex gap-1 items-center opacity-0 transition-opacity group-hover:opacity-100">
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
                    className="p-1 rounded hover:bg-green-900"
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
                  className="p-1 rounded hover:bg-accent"
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
                  className="p-1 rounded hover:bg-accent"
                  title="New folder"
                >
                  <FolderPlus className="w-3 h-3 text-muted-foreground" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyPath(node.path);
              }}
              className="p-1 rounded hover:bg-accent"
              title="Copy path"
            >
              <Copy className="w-3 h-3 text-muted-foreground" />
            </button>
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
              className="p-1 rounded hover:bg-red-600"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      {isExpanded &&
        (hasChildren ||
          newItem?.parentPath ===
            node.path) && (
          <div>
            {newItem?.parentPath ===
              node.path && (
              <div
                className="flex gap-1 items-center px-2 py-1"
                style={{
                  paddingLeft: `${(level + 1) * 12 + 8}px`,
                }}
              >
                {newItem.type ===
                "directory" ? (
                  <Folder className="w-4 h-4 text-yellow-400" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
                <input
                  autoFocus
                  className="bg-background border border-primary rounded px-1 py-0.5 text-sm outline-none w-full"
                  value={newItemName}
                  onChange={(e) =>
                    setNewItemName(
                      e.target.value,
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    )
                      onSaveNewItem();
                    if (
                      e.key === "Escape"
                    )
                      onCancelNewItem();
                  }}
                  onBlur={onSaveNewItem}
                />
              </div>
            )}
            {node.children?.map(
              (child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  level={level + 1}
                  onFileSelect={
                    onFileSelect
                  }
                  onFolderSelect={onFolderSelect}
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
                  newItem={newItem}
                  newItemName={
                    newItemName
                  }
                  setNewItemName={
                    setNewItemName
                  }
                  onCancelNewItem={
                    onCancelNewItem
                  }
                  onSaveNewItem={
                    onSaveNewItem
                  }
                  onCopyPath={
                    onCopyPath
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
  onFolderSelect,
  onRefresh,
  onRunFolder,
  viewMode,
  resizable = true,
}: FileBrowserProps) {
  const { toast } = useToast();
  const [
    expandedPaths,
    setExpandedPaths,
  ] = useState<Set<string>>(new Set());
  const [
    sidebarWidth,
    setSidebarWidth,
  ] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [newItem, setNewItem] =
    useState<{
      parentPath: string;
      type: "file" | "directory";
    } | null>(null);
  const [newItemName, setNewItemName] =
    useState("");
  const [isResizing, setIsResizing] =
    useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(
    SIDEBAR_DEFAULT_WIDTH,
  );

  const handleCopyPath = (
    path: string,
  ) => {
    navigator.clipboard.writeText(path);
    toast({
      title: "Copied",
      description:
        "File path copied to clipboard",
    });
  };

  useEffect(() => {
    if (!fileTree) return;

    if (fileTree && fileTree.type === 'directory') {
       setExpandedPaths(new Set([fileTree.path]));
    }
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

      if (response.ok) {
        toast({
          title: "Success",
          description: `${type === "directory" ? "Folder" : "File"} deleted successfully`,
        });
        if (onRefresh) onRefresh();
      } else {
        const data =
          await response.json();
        toast({
          title: "Error",
          description:
            data.error ||
            `Failed to delete ${type}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(
        "Failed to delete:",
        error,
      );
      toast({
        title: "Error",
        description:
          "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleAddFile = async (
    path: string,
  ) => {
    setNewItem({
      parentPath: path,
      type: "file",
    });
    setNewItemName("");
    if (!expandedPaths.has(path)) {
      toggleExpand(path);
    }
  };

  const handleAddFolder = async (
    path: string,
  ) => {
    setNewItem({
      parentPath: path,
      type: "directory",
    });
    setNewItemName("");
    if (!expandedPaths.has(path)) {
      toggleExpand(path);
    }
  };

  const handleCancelNewItem = () => {
    setNewItem(null);
    setNewItemName("");
  };

  const handleSaveNewItem =
    async () => {
      if (
        !newItem ||
        !newItemName.trim()
      ) {
        handleCancelNewItem();
        return;
      }
      let name = newItemName.trim();

      if (newItem.type === "file") {
        const hasExtension = name.includes(".");
        if (
          viewMode === "docs" &&
          !hasExtension
        ) {
          name += ".md";
        } else if (
          viewMode === "tests" &&
          !hasExtension
        ) {
          name += ".ts";
        }
      }

      const filePath =
        `${newItem.parentPath}/${name}`.replace(
          /\/+$/,
          "",
        );

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
              action:
                newItem.type ===
                "directory"
                  ? "mkdir"
                  : undefined,
              content: "",
            }),
          },
        );

        if (response.ok) {
          toast({
            title: "Success",
            description: `${
              newItem.type ===
              "directory"
                ? "Folder"
                : "File"
            } created successfully`,
          });
          if (onRefresh) onRefresh();
        } else {
          const data =
            await response.json();
          toast({
            title: "Error",
            description:
              data.error ||
              `Failed to create ${newItem.type}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          `Failed to create ${newItem.type}:`,
          error,
        );
        toast({
          title: "Error",
          description:
            "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        handleCancelNewItem();
      }
    };

  return (
    <>
      <div
        className={`flex relative flex-col shrink-0 bg-background h-full ${resizable ? "border-r border-border" : "w-full"}`}
        style={resizable ? { width: sidebarWidth } : {}}
      >
        {resizable && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            className="absolute top-0 right-0 z-10 w-2 h-full border-r border-transparent transition-colors select-none cursor-col-resize hover:border-muted-foreground hover:bg-secondary active:bg-accent"
            onMouseDown={
              handleResizeStart
            }
          />
        )}
        <div className="overflow-y-auto flex-1 p-2">
          {fileTree ? (
            <FileTreeNode
              node={fileTree}
              level={0}
              onFileSelect={
                onFileSelect
              }
              onFolderSelect={onFolderSelect}
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
              newItem={newItem}
              newItemName={newItemName}
              setNewItemName={
                setNewItemName
              }
              onCancelNewItem={
                handleCancelNewItem
              }
              onSaveNewItem={
                handleSaveNewItem
              }
              onCopyPath={
                handleCopyPath
              }
            />
          ) : (
            <p className="p-2 text-sm text-muted-foreground">
              No repository selected
            </p>
          )}
        </div>
      </div>
    </>
  );
}
