import React from "react";
import {
  File,
  Folder,
  PieChart as PieChartIcon,
  FileText,
  Image as ImageIcon,
  Film,
  Code,
} from "lucide-react";
import { getViewModeColor } from "@/lib/view-config";
import { useHomeStore } from "@/store/useHomeStore";


interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
  isProject?: boolean;
  isContainer?: boolean;
}

interface DiskUsageChartProps {
  node: FileNode;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function DiskUsageChart({ node }: DiskUsageChartProps) {
  const store = useHomeStore();
  const { viewMode } = store.getProjectState();
  const themeColor = getViewModeColor(viewMode);

  const getFileIcon = (
    name: string,
    type: "file" | "directory",
    isProject?: boolean,
    isContainer?: boolean,
  ) => {
    if (type === "directory")
      return (
        <Folder
          className={`w-4 h-4 ${isProject || isContainer ? themeColor.folderLight || "text-blue-400" : themeColor.folder || "text-blue-500"}`}
        />
      );

    const ext = name.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "json":
        return <Code className={`w-4 h-4 ${themeColor.file || "text-muted-foreground"}`} />;
      case "md":
      case "txt":
        return <FileText className="w-4 h-4 text-slate-400" />;
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "webp":
        return <ImageIcon className="w-4 h-4 text-teal-400" />;
      case "mp4":
      case "webm":
      case "mov":
        return <Film className="w-4 h-4 text-cyan-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  const children = React.useMemo(() => {
    if (!node.children) return [];
    // Sort by size descending
    return [...node.children].sort((a, b) => (b.size || 0) - (a.size || 0));
  }, [node]);

  const totalSize = node.size || 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-full">
          <PieChartIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{node.name}</h2>
          <p className="text-sm text-muted-foreground">{node.path}</p>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="text-2xl font-bold">{formatBytes(totalSize)}</span>
          <span className="text-xs text-muted-foreground">Total Size</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-4">
          {children.map((child) => {
            const size = child.size || 0;
            const percentage = totalSize > 0 ? (size / totalSize) * 100 : 0;
            const isDirectory = child.type === "directory";

            return (
              <div
                key={child.path}
                className="group p-2 -mx-2 rounded-lg transition-colors hover:bg-secondary/30"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  {getFileIcon(
                    child.name,
                    child.type,
                    child.isProject,
                    child.isContainer,
                  )}
                  <span
                    className="font-medium truncate flex-1"
                    title={child.name}
                  >
                    {child.name}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatBytes(size)}
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isDirectory ? themeColor.folderBar || "bg-blue-500/70" : themeColor.fileBar || "bg-indigo-500/70"}`}
                    style={{
                      width: `${Math.max(percentage, 0.5)}%`,
                      boxShadow: `0 0 8px ${isDirectory ? themeColor.folderGlow || "rgba(59, 130, 246, 0.4)" : themeColor.fileGlow || "rgba(99, 102, 241, 0.4)"}`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {children.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Empty folder
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
