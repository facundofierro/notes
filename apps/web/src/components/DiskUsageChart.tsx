import React from "react";
import { 
  File, 
  Folder, 
  PieChart as PieChartIcon, 
  FileText,
  Image as ImageIcon,
  Film,
  Code
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
}

interface DiskUsageChartProps {
  node: FileNode;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIcon(name: string, type: "file" | "directory") {
  if (type === "directory") return <Folder className="w-4 h-4 text-yellow-500" />;
  
  const ext = name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'json':
      return <Code className="w-4 h-4 text-blue-500" />;
    case 'md':
    case 'txt':
      return <FileText className="w-4 h-4 text-gray-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <ImageIcon className="w-4 h-4 text-purple-500" />;
    case 'mp4':
    case 'webm':
    case 'mov':
      return <Film className="w-4 h-4 text-red-500" />;
    default:
      return <File className="w-4 h-4 text-gray-500" />;
  }
}

export default function DiskUsageChart({ node }: DiskUsageChartProps) {
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
                    <div key={child.path} className="group">
                        <div className="flex items-center gap-3 mb-1.5">
                            {getFileIcon(child.name, child.type)}
                            <span className="font-medium truncate flex-1" title={child.name}>
                                {child.name}
                            </span>
                            <span className="text-sm text-muted-foreground tabular-nums">
                                {formatBytes(size)}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${isDirectory ? 'bg-yellow-500/70' : 'bg-blue-500/70'}`}
                                style={{ width: `${Math.max(percentage, 0.5)}%` }}
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
