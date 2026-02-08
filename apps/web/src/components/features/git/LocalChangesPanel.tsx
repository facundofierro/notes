"use client";

import * as React from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  GitCommit, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown,
  Check,
  Plus,
  Minus,
  GitBranch
} from "lucide-react";

interface GitFile {
  path: string;
  status: "staged" | "modified" | "untracked" | "committed";
  code: string;
  commitHash?: string;
}

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: GitFile[];
}

interface GitStatus {
  branch: string;
  upstream: string;
  ahead: number;
  behind: number;
  files: GitFile[];
  localCommits: GitCommit[];
}

interface LocalChangesPanelProps {
  repoPath: string;
  onSelectFile: (file: GitFile) => void;
  selectedFile: string | null;
  className?: string;
}

export function LocalChangesPanel({ repoPath, onSelectFile, selectedFile, className }: LocalChangesPanelProps) {
  const [status, setStatus] = React.useState<GitStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [commitMessage, setCommitMessage] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/git?path=${encodeURIComponent(repoPath)}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch git status", e);
    } finally {
      setRefreshing(false);
    }
  }, [repoPath]);

  React.useEffect(() => {
    fetchStatus();
    // Poll every 10s? Or rely on manual refresh/actions?
    // Let's rely on actions for now + manual refresh
  }, [fetchStatus]);

  const handleStage = async (file: string) => {
    await fetch("/api/git", {
      method: "POST",
      body: JSON.stringify({ action: "stage", repoPath, files: [file] }),
    });
    fetchStatus();
  };

  const handleUnstage = async (file: string) => {
    await fetch("/api/git", {
      method: "POST",
      body: JSON.stringify({ action: "unstage", repoPath, files: [file] }),
    });
    fetchStatus();
  };

  const handleStageAll = async () => {
    await fetch("/api/git", {
      method: "POST",
      body: JSON.stringify({ action: "stage", repoPath }),
    });
    fetchStatus();
  };

  const handleCommit = async () => {
    if (!commitMessage) return;
    setLoading(true);
    await fetch("/api/git", {
      method: "POST",
      body: JSON.stringify({ action: "commit", repoPath, message: commitMessage }),
    });
    setCommitMessage("");
    setLoading(false);
    fetchStatus();
  };

  const handleGenerateMessage = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-commit", {
        method: "POST",
        body: JSON.stringify({ repoPath }), // API will fetch staged diff if not provided
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) setCommitMessage(data.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handlePush = async () => {
     setLoading(true);
     await fetch("/api/git", { method: "POST", body: JSON.stringify({ action: "push", repoPath }) });
     setLoading(false);
     fetchStatus();
  };

  const handlePull = async () => {
     setLoading(true);
     await fetch("/api/git", { method: "POST", body: JSON.stringify({ action: "pull", repoPath }) });
     setLoading(false);
     fetchStatus();
  };

  // Helper to group files by folder
  const groupFilesByFolder = (files: GitFile[]) => {
    const groups: Record<string, GitFile[]> = {};
    files.forEach(f => {
      const excludeFile = f.path.split("/").slice(0, -1).join("/") || ".";
      if (!groups[excludeFile]) groups[excludeFile] = [];
      groups[excludeFile].push(f);
    });
    return groups;
  };

  // truncate path helper
  const truncatePath = (path: string) => {
     if (path.length > 30) {
        return "..." + path.substring(path.length - 27);
     }
     return path;
  };

  const stagedFiles = status?.files.filter(f => f.status === "staged") || [];
  const unstagedFiles = status?.files.filter(f => f.status !== "staged") || [];
  
  const groupedStaged = groupFilesByFolder(stagedFiles);
  const groupedUnstaged = groupFilesByFolder(unstagedFiles);

  const hasStaged = stagedFiles.length > 0;
  const hasUnstaged = unstagedFiles.length > 0;

  return (
    <div className={`flex flex-col h-full bg-secondary/5 border-r border-border ${className}`}>
        
      {/* 1. Header: Branch & Actions */}
      <div className="p-3 border-b border-border bg-background/50 flex items-center justify-between gap-2">
         {/* Left: Branch Info */}
         <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate" title={status?.branch}>
                    {status?.branch || "..."}
                </span>
            </div>
            <button onClick={fetchStatus} disabled={refreshing} className={`p-1.5 hover:bg-secondary rounded-full ${refreshing ? "animate-spin" : ""}`}>
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
         </div>

         {/* Right: Push/Pull Buttons */}
         <div className="flex items-center gap-2 flex-shrink-0">
            <button 
               onClick={handlePull}
               disabled={loading}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full border border-border text-[10px] font-medium transition-colors shadow-sm"
               title="Pull Changes"
            >
               <ArrowDown className="w-3.5 h-3.5" />
               <span>{status?.behind || 0}</span>
            </button>
            <button 
               onClick={handlePush}
               disabled={loading}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full border border-border text-[10px] font-medium transition-colors shadow-sm"
               title="Push Changes"
            >
               <ArrowUp className="w-3.5 h-3.5" />
               <span>{status?.ahead || 0}</span>
            </button>
         </div>
      </div>

      {/* 2. Commit Section */}
      <div className="p-3 border-b border-border flex flex-col gap-3 bg-secondary/5">
         <textarea 
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="w-full h-20 bg-background border border-border rounded-xl p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
         />
         
         <div className="flex gap-2">
             <button 
               onClick={handleCommit}
               disabled={!hasStaged || !commitMessage || loading}
               className="flex-1 bg-primary text-primary-foreground text-xs py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
             >
               <GitCommit className="w-3.5 h-3.5" />
               Commit
             </button>

             {hasUnstaged && (
               <button 
                 onClick={handleStageAll}
                 disabled={loading}
                 className="px-4 bg-background text-foreground border border-border text-xs py-2 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 shadow-sm transition-all whitespace-nowrap"
                 title="Stage All"
               >
                 Stage all
               </button>
             )}

             <button 
               onClick={handleGenerateMessage}
               disabled={generating}
               className="px-3 bg-background border border-border text-primary hover:bg-primary/5 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
               title="Generate with AI"
             >
                <Sparkles className="w-4 h-4" />
             </button>
         </div>
      </div>

      {/* 3. Main List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-0">
        
        {/* STAGED FILES GROUP */}
        <ChangeGroup title="Staged Changes" count={stagedFiles.length} color="bg-green-500">
           {stagedFiles.length === 0 ? (
               <div className="py-4 text-center text-[10px] text-muted-foreground/50 italic">No staged changes</div>
           ) : (
             <div className="px-3">
               {Object.entries(groupedStaged).map(([folder, files]) => (
                    <div key={folder} className="bg-background border border-border rounded-xl overflow-hidden mb-1 shadow-sm group/card hover:border-border/80 transition-colors">
                        <div className="px-3 py-1 bg-secondary/30 text-[10px] font-mono text-muted-foreground truncate text-right" title={folder}>
                            {truncatePath(folder)}
                        </div>
                        <div className="">
                            {files.map(file => (
                                <FileItem 
                                    key={file.path}
                                    file={file}
                                    selected={selectedFile === file.path}
                                    onSelect={onSelectFile}
                                    onAction={handleUnstage}
                                    actionIcon={Minus}
                                    actionTitle="Unstage"
                                    dotClass="hidden"
                                    actionButtonClass="hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500"
                                />
                            ))}
                        </div>
                    </div>
                ))}
             </div>
           )}
        </ChangeGroup>

        {/* UNSTAGED FILES GROUP */}
        <ChangeGroup title="Changes" count={unstagedFiles.length} color="bg-amber-500">
            {unstagedFiles.length === 0 ? (
               <div className="py-4 text-center text-[10px] text-muted-foreground/50 italic">No changes</div>
            ) : (
              <div className="px-3">
                {Object.entries(groupedUnstaged).map(([folder, files]) => (
                    <div key={folder} className="bg-background border border-border rounded-xl overflow-hidden mb-1 shadow-sm group/card hover:border-border/80 transition-colors">
                        <div className="px-3 py-1 bg-secondary/30 text-[10px] font-mono text-muted-foreground truncate text-right" title={folder}>
                            {truncatePath(folder)}
                        </div>
                        <div className="">
                            {files.map(file => (
                                <FileItem 
                                    key={file.path}
                                    file={file}
                                    selected={selectedFile === file.path}
                                    onSelect={onSelectFile}
                                    onAction={handleStage}
                                    actionIcon={Plus}
                                    actionTitle="Stage"
                                    dotClass="hidden"
                                    actionButtonClass="hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-500"
                                />
                            ))}
                        </div>
                    </div>
                ))}
              </div>
            )}
        </ChangeGroup>

        {/* LOCAL COMMITS GROUPS */}
        {status?.localCommits && status.localCommits.length > 0 && (
             <>
                {status.localCommits.map(commit => (
                    <ChangeGroup 
                        key={commit.hash} 
                        title={commit.message.split("\n")[0]} 
                        count={commit.files ? commit.files.length : 0} 
                        color="bg-purple-500"
                        defaultOpen={false}
                        uppercase={false}
                    >
                        <div className="px-3">
                           {/* Commit Details Header */}
                           <div className="mb-2 px-2 text-[10px] text-muted-foreground flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded-full">
                                    <GitCommit className="w-3 h-3" />
                                    <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                                </div>
                                <span>{commit.date}</span>
                                <span className="truncate max-w-[100px]">{commit.author}</span>
                           </div>

                           {commit.files && Object.entries(groupFilesByFolder(commit.files)).map(([folder, files]) => (
                                <div key={folder} className="bg-background border border-border rounded-xl overflow-hidden mb-1 shadow-sm group/card hover:border-border/80 transition-colors">
                                    <div className="px-3 py-1 bg-secondary/30 text-[10px] font-mono text-muted-foreground truncate text-right" title={folder}>
                                        {truncatePath(folder)}
                                    </div>
                                    <div className="">
                                        {files.map(file => (
                                            <FileItem 
                                                key={file.path}
                                                file={{...file, commitHash: commit.hash}}
                                                selected={selectedFile === file.path}
                                                onSelect={onSelectFile}
                                                onAction={() => {}} 
                                                actionIcon={Check}
                                                actionTitle="Committed"
                                                dotClass="bg-purple-500"
                                                actionButtonClass="hidden"
                                            />
                                        ))}
                                    </div>
                                </div>
                           ))}
                        </div>
                    </ChangeGroup>
                ))}
            </>
        )}



      </div>
    </div>
  );
}

interface ChangeGroupProps {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  uppercase?: boolean;
}

function ChangeGroup({ title, count, color, children, defaultOpen = true, uppercase = true }: ChangeGroupProps) {
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
         <div className="pl-0 pb-2 overflow-y-auto max-h-[300px]">
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
  onAction: (path: string) => void;
  actionIcon: React.ElementType;
  actionTitle: string;
  dotClass: string;
  actionButtonClass: string;
}

function FileItem({ 
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
            className={`flex items-center gap-2 px-3 py-0.5 hover:bg-accent/50 cursor-pointer text-xs group ${selected ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => onSelect(file)}
        >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
            <span 
                ref={textRef}
                className={`flex-1 truncate font-medium transition-all ${isTight ? "text-[10px] leading-tight" : ""}`}
                title={file.path.split("/").pop()}
            >
                {file.path.split("/").pop()}
            </span>
            <button 
                onClick={(e) => { e.stopPropagation(); onAction(file.path); }} 
                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ${actionButtonClass}`} 
                title={actionTitle}
            >
                <Icon className="w-3 h-3" />
            </button>
        </div>
    );
}
