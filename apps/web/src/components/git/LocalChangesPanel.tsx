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
  Minus
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
  const [uncommittedOpen, setUncommittedOpen] = React.useState(true);
  const [localCommitsOpen, setLocalCommitsOpen] = React.useState(true);
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

  // Group files by folder
  const groupedFiles = React.useMemo(() => {
    if (!status?.files) return {};
    const groups: Record<string, GitFile[]> = {};
    status.files.forEach(f => {
      const excludeFile = f.path.split("/").slice(0, -1).join("/") || ".";
      if (!groups[excludeFile]) groups[excludeFile] = [];
      groups[excludeFile].push(f);
    });
    return groups;
  }, [status?.files]);

  // truncate path helper
  const truncatePath = (path: string) => {
     if (path.length > 30) {
        return "..." + path.substring(path.length - 27);
     }
     return path;
  };

  const stagedFiles = status?.files.filter(f => f.status === "staged") || [];
  const changesCount = status?.files.length || 0;
  const hasStaged = stagedFiles.length > 0;
  const hasUnstaged = status?.files.some(f => f.status !== "staged") || false;

  return (
    <div className={`flex flex-col h-full bg-secondary/5 border-r border-border ${className}`}>
        
      {/* 1. Commit Message Section */}
      <div className="p-3 border-b border-border flex flex-col gap-2">
         <textarea 
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="w-full h-16 bg-background border border-border rounded p-2 text-xs resize-none focus:outline-none focus:border-primary"
         />
         <button 
           onClick={handleGenerateMessage}
           disabled={generating}
           className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
         >
            <Sparkles className="w-3 h-3" />
            {generating ? "Generating..." : "Generate with AI"}
         </button>
      </div>

      {/* 2. Actions Row */}
      <div className="p-2 flex gap-2 border-b border-border">
         <button 
           onClick={handleCommit}
           disabled={!hasStaged || !commitMessage || loading}
           className="flex-1 bg-primary text-primary-foreground text-xs py-1.5 rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
         >
           <GitCommit className="w-3.5 h-3.5" />
           Commit
         </button>
         {hasUnstaged && (
           <button 
             onClick={handleStageAll}
             disabled={loading}
             className="px-3 bg-secondary text-secondary-foreground border border-border text-xs py-1.5 rounded hover:bg-secondary/80 disabled:opacity-50"
             title="Stage All"
           >
             <Plus className="w-3.5 h-3.5" />
           </button>
         )}
      </div>

      {/* 3. Changes List - Uncommitted */}
      <div className="flex-1 overflow-y-auto">
        <div>
          <button 
            onClick={() => setUncommittedOpen(!uncommittedOpen)}
            className="w-full flex items-center justify-between p-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/10 uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/50"
          >
            <span>Changes ({changesCount})</span>
            {uncommittedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          {uncommittedOpen && (
             <div className="flex flex-col">
                {changesCount === 0 && <div className="p-3 text-xs text-muted-foreground text-center italic">No local changes</div>}
                
                {Object.entries(groupedFiles).map(([folder, files]) => (
                   <div key={folder} className="flex flex-col">
                      <div className="px-2 py-1 bg-secondary/10 text-[10px] font-mono text-muted-foreground truncate text-right border-y border-border/30" title={folder}>
                         {truncatePath(folder)}
                      </div>
                      {files.map(file => (
                        <div 
                          key={file.path} 
                          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 cursor-pointer text-xs group ${selectedFile === file.path ? "bg-accent text-accent-foreground" : ""}`}
                          onClick={() => onSelectFile(file)}
                        >
                           {/* Status Indicator */}
                           <span className={`w-1.5 h-1.5 rounded-full ${
                             file.status === "staged" ? "bg-green-500" :
                             file.status === "modified" ? "bg-amber-500" :
                             "bg-slate-500"
                           }`} />
                           
                           <span className="flex-1 truncate">{file.path.split("/").pop()}</span>
                           
                           {/* Action button (Stage/Unstage) - visible on hover */}
                           <div className="opacity-0 group-hover:opacity-100 flex items-center">
                              {file.status === "staged" ? (
                                <button onClick={(e) => { e.stopPropagation(); handleUnstage(file.path); }} className="p-1 hover:bg-background rounded" title="Unstage">
                                   <Minus className="w-3 h-3 text-red-500" />
                                </button>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); handleStage(file.path); }} className="p-1 hover:bg-background rounded" title="Stage">
                                   <Plus className="w-3 h-3 text-green-500" />
                                </button>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                ))}
             </div>
          )}
        </div>

        {/* 4. Local Commits (Outgoing) */}
        <div>
          <button 
            onClick={() => setLocalCommitsOpen(!localCommitsOpen)}
            className="w-full flex items-center justify-between p-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/10 uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/50"
          >
            <span>Local Commits ({status?.localCommits.length || 0})</span>
            {localCommitsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          {localCommitsOpen && (
             <div className="flex flex-col">
                {(status?.localCommits || []).map(commit => (
                   <div key={commit.hash} className="p-2 border-b border-border/30 text-xs hover:bg-accent/30">
                      <div className="font-medium truncate">{commit.message}</div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                         <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                         <span>{commit.date}</span>
                      </div>
                   </div>
                ))}
                {(status?.localCommits.length || 0) === 0 && (
                   <div className="p-3 text-xs text-muted-foreground text-center italic">No outgoing commits</div>
                )}
             </div>
          )}
        </div>

      </div>

      {/* 5. Footer Status */}
      <div className="p-2 border-t border-border bg-background text-xs flex flex-col gap-2">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
               <GitCommit className="w-3.5 h-3.5" />
               <span className="truncate max-w-[120px]" title={status?.branch}>{status?.branch || "..."}</span>
            </div>
            <button onClick={fetchStatus} disabled={refreshing} className={`p-1 hover:bg-secondary rounded ${refreshing ? "animate-spin" : ""}`}>
               <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
         </div>
         
         <div className="grid grid-cols-2 gap-2">
            <button 
               onClick={handlePull}
               disabled={loading}
               className="flex items-center justify-center gap-1 px-2 py-1.5 bg-secondary hover:bg-secondary/80 rounded border border-border"
            >
               <ArrowDown className="w-3.5 h-3.5" />
               <span>Pull {status?.behind || 0}</span>
            </button>
            <button 
               onClick={handlePush}
               disabled={loading}
               className="flex items-center justify-center gap-1 px-2 py-1.5 bg-secondary hover:bg-secondary/80 rounded border border-border"
            >
               <ArrowUp className="w-3.5 h-3.5" />
               <span>Push {status?.ahead || 0}</span>
            </button>
         </div>
      </div>

    </div>
  );
}
