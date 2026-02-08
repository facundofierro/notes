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
  status: "staged" | "modified" | "untracked";
  code: string;
}

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
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
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        
        {/* STAGED FILES GROUP */}
        {hasStaged && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Staged Changes ({stagedFiles.length})
                </h3>
                
                {Object.entries(groupedStaged).map(([folder, files]) => (
                    <div key={folder} className="bg-background border border-border rounded-xl overflow-hidden mb-3 shadow-sm group/card hover:border-border/80 transition-colors">
                        <div className="px-3 py-2 bg-secondary/30 text-[10px] font-mono text-muted-foreground truncate border-b border-border/50 flex items-center gap-2" title={folder}>
                            <span className="opacity-70">📁</span>
                            {truncatePath(folder)}
                        </div>
                        <div className="divide-y divide-border/30">
                            {files.map(file => (
                                <div 
                                key={file.path} 
                                className={`flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer text-xs group ${selectedFile === file.path ? "bg-accent text-accent-foreground" : ""}`}
                                onClick={() => onSelectFile(file)}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="flex-1 truncate font-medium">{file.path.split("/").pop()}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleUnstage(file.path); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 rounded transition-all" title="Unstage">
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* UNSTAGED FILES GROUP */}
        {hasUnstaged && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 delay-75">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 pl-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                     Changes ({unstagedFiles.length})
                </h3>

                {Object.entries(groupedUnstaged).map(([folder, files]) => (
                    <div key={folder} className="bg-background border border-border rounded-xl overflow-hidden mb-3 shadow-sm group/card hover:border-border/80 transition-colors">
                        <div className="px-3 py-2 bg-secondary/30 text-[10px] font-mono text-muted-foreground truncate border-b border-border/50 flex items-center gap-2" title={folder}>
                            <span className="opacity-70">📁</span>
                            {truncatePath(folder)}
                        </div>
                        <div className="divide-y divide-border/30">
                            {files.map(file => (
                                <div 
                                key={file.path} 
                                className={`flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer text-xs group ${selectedFile === file.path ? "bg-accent text-accent-foreground" : ""}`}
                                onClick={() => onSelectFile(file)}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${file.status === "modified" ? "bg-amber-500" : "bg-slate-500"}`} />
                                    <span className="flex-1 truncate font-medium">{file.path.split("/").pop()}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleStage(file.path); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-500 rounded transition-all" title="Stage">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* LOCAL COMMITS GROUPS */}
        {status?.localCommits && status.localCommits.length > 0 && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-200 delay-100">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    Outgoing Commits ({status.localCommits.length})
                </h3>
                <div className="space-y-3">
                    {status.localCommits.map(commit => (
                        <div key={commit.hash} className="bg-background border border-border rounded-xl p-3 shadow-sm hover:border-primary/30 transition-colors">
                             <div className="flex items-start gap-2.5">
                                <GitCommit className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-foreground break-words leading-relaxed">
                                        {commit.message}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
                                        <div className="flex items-center gap-2 bg-secondary/50 pl-1 pr-2 py-0.5 rounded-full">
                                            <span className="font-mono text-primary/70">#</span>
                                            <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                                        </div>
                                        <span>{commit.date}</span>
                                    </div>
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* EMPTY STATE */}
        {!hasStaged && !hasUnstaged && (!status?.localCommits || status.localCommits.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
               <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6" />
               </div>
               <span className="text-xs font-medium">All clean</span>
            </div>
        )}

      </div>
    </div>
  );
}
