import * as React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

export interface GitFile {
  path: string;
  status: "staged" | "modified" | "untracked" | "committed";
  code: string;
  commitHash?: string;
  additions?: number;
  deletions?: number;
}

interface ChangeGroupProps {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  uppercase?: boolean;
}

export function ChangeGroup({ title, count, color, children, defaultOpen = true, uppercase = true }: ChangeGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="flex flex-col border-b border-border/50">
       <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-2 hover:bg-secondary/20 transition-colors w-full text-left group">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70" />}
          <span className={`w-2 h-2 rounded-full ${count === 0 ? "bg-zinc-500/50" : color} shadow-sm`} />
          <span className={`text-[11px] font-semibold text-muted-foreground tracking-wider flex-1 group-hover:text-foreground transition-colors truncate ${uppercase ? "uppercase" : ""}`}>{title}</span>
          <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-full border border-border/50">{count}</span>
       </button>
       {isOpen && (
         <div className="pl-0 pb-2 w-full">
            {children}
         </div>
       )}
    </div>
  );
}

interface FileItemProps {
  file: GitFile;
  selected: boolean;
  onSelect: (file: GitFile) => void;
  onAction?: (path: string) => void;
  actionIcon?: React.ElementType;
  actionTitle?: string;
  dotClass?: string;
  actionButtonClass?: string;
}

export function FileItem({ 
  file, 
  selected, 
  onSelect, 
  onAction, 
  actionIcon: Icon, 
  actionTitle, 
  dotClass, 
  actionButtonClass 
}: FileItemProps) {
    const textRef = React.useRef<HTMLSpanElement>(null);
    const [isTight, setIsTight] = React.useState(false);

    React.useEffect(() => {
        if (textRef.current && textRef.current.scrollWidth > textRef.current.clientWidth) {
            setIsTight(true);
        }
    }, [file.path]); 

    return (
        <div 
            className={`flex items-center gap-2 px-3 py-0.5 hover:bg-accent/50 cursor-pointer text-xs group min-w-0 ${selected ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => onSelect(file)}
        >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass || "bg-muted"}`} />
            <span 
                ref={textRef}
                className={`flex-1 truncate font-medium transition-all ${isTight ? "text-[10px] leading-tight" : ""}`}
                title={file.path.split("/").pop()}
            >
                {file.path.split("/").pop()}
            </span>
            {onAction && Icon && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onAction(file.path); }} 
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ${actionButtonClass}`} 
                    title={actionTitle}
                >
                    <Icon className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

export const groupFilesByFolder = (files: GitFile[]) => {
    const groups: Record<string, GitFile[]> = {};
    files.forEach(f => {
      const excludeFile = f.path.split("/").slice(0, -1).join("/") || ".";
      if (!groups[excludeFile]) groups[excludeFile] = [];
      groups[excludeFile].push(f);
    });
    return groups;
};

export const truncatePath = (path: string) => {
     if (path.length > 30) {
        return "..." + path.substring(path.length - 27);
     }
     return path;
};

interface FileGroupListProps {
    files: GitFile[];
    selectedFile: string | null;
    onSelect: (file: GitFile) => void;
    onAction?: (path: string) => void;
    actionIcon?: React.ElementType;
    actionTitle?: string;
    dotClass?: string;
    actionButtonClass?: string;
}

export function FileGroupList({
    files,
    selectedFile,
    onSelect,
    onAction,
    actionIcon,
    actionTitle,
    dotClass,
    actionButtonClass
}: FileGroupListProps) {
    const groupedFiles = React.useMemo(() => groupFilesByFolder(files), [files]);

    return (
        <div className="px-3 w-full min-w-0">
            {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
                <div key={folder} className="bg-background border border-border rounded-xl overflow-hidden mb-1 shadow-sm group/card hover:border-border/80 transition-colors w-full min-w-0">
                    <div className="px-3 py-1 bg-secondary/30 text-[10px] font-mono text-muted-foreground truncate text-right w-full" style={{ direction: "rtl" }} title={folder}>
                        &lrm;{folder}&lrm;
                    </div>
                    <div className="">
                        {folderFiles.map(file => (
                            <FileItem 
                                key={file.path}
                                file={file}
                                selected={selectedFile === file.path}
                                onSelect={onSelect}
                                onAction={onAction}
                                actionIcon={actionIcon}
                                actionTitle={actionTitle}
                                dotClass={dotClass}
                                actionButtonClass={actionButtonClass}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
