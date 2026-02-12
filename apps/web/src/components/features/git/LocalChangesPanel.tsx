"use client";

import * as React from "react";
import {
  Sparkles,
  GitCommit,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Check,
  Plus,
  Minus,
  GitBranch,
} from "lucide-react";
import { getViewModeColor } from "@/lib/view-config";

import {
  GitFile,
  ChangeGroup,
  FileItem,
  FileGroupList,
  groupFilesByFolder,
  truncatePath,
} from "./GitSharedComponents";

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

import { BranchSwitcher } from "./BranchSwitcher";

interface LocalChangesPanelProps {
  repoPath: string;
  projectName?: string;
  onSelectFile: (file: GitFile) => void;
  selectedFile: string | null;
  className?: string;
}

import { useHomeStore } from "@/store/useHomeStore";

export function LocalChangesPanel({
  repoPath,
  projectName,
  onSelectFile,
  selectedFile,
  className,
}: LocalChangesPanelProps) {
  const { viewMode, gitStatus } = useHomeStore((s) => {
    const pState = s.selectedRepo ? s.projectStates[s.selectedRepo] : null;
    return {
      viewMode: pState?.viewMode || "review",
      gitStatus: pState?.gitStatus,
    };
  }, (oldVal, newVal) => {
    return (
      oldVal.viewMode === newVal.viewMode &&
      oldVal.gitStatus === newVal.gitStatus
    );
  });
  const themeColor = getViewModeColor(viewMode);
  const [status, setStatus] = React.useState<GitStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [commitMessage, setCommitMessage] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastFetchRef = React.useRef<number>(0);
  const MIN_FETCH_INTERVAL = 1000; // 1 second

  const [lastUpdatedText, setLastUpdatedText] = React.useState<string>("");

  React.useEffect(() => {
    const updateTime = () => {
      if (!gitStatus?.lastPolledAt) {
        setLastUpdatedText("");
        return;
      }
      const seconds = Math.floor((Date.now() - gitStatus.lastPolledAt) / 1000);
      if (seconds < 5) setLastUpdatedText("Just now");
      else if (seconds < 60) setLastUpdatedText(`${seconds}s ago`);
      else setLastUpdatedText(`${Math.floor(seconds / 60)}m ago`);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [gitStatus?.lastPolledAt]);

  const fetchStatus = React.useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) return;
    lastFetchRef.current = now;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 15-second timeout so the spinner never runs indefinitely
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      setRefreshing(true);
      const res = await fetch(`/api/git?path=${encodeURIComponent(repoPath)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Failed to fetch git status", e);
      }
    } finally {
      clearTimeout(timeout);
      setRefreshing(false);
    }
  }, [repoPath]);

  React.useEffect(() => {
    fetchStatus(true);
    return () => {
      abortRef.current?.abort();
    };
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
      body: JSON.stringify({
        action: "commit",
        repoPath,
        message: commitMessage,
      }),
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
    try {
      await fetch("/api/git", {
        method: "POST",
        body: JSON.stringify({ action: "push", repoPath }),
      });
    } catch (e) {
      console.error("Push failed", e);
    } finally {
      setLoading(false);
      fetchStatus();
    }
  };

  const handlePull = async () => {
    setLoading(true);
    try {
      await fetch("/api/git", {
        method: "POST",
        body: JSON.stringify({ action: "pull", repoPath }),
      });
    } catch (e) {
      console.error("Pull failed", e);
    } finally {
      setLoading(false);
      fetchStatus();
    }
  };

  const stagedFiles = status?.files.filter((f) => f.status === "staged") || [];
  const unstagedFiles =
    status?.files.filter((f) => f.status !== "staged") || [];

  // const groupedStaged = groupFilesByFolder(stagedFiles);
  // const groupedUnstaged = groupFilesByFolder(unstagedFiles);

  const hasStaged = stagedFiles.length > 0;
  const hasUnstaged = unstagedFiles.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-secondary/5 border-r border-border min-w-0 ${className}`}
    >
      {/* 1. Header: Branch & Actions */}
      <div className="p-3 border-b border-border bg-background/50 flex items-center justify-between gap-2">
        {/* Left: Branch Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <BranchSwitcher
            currentBranch={gitStatus?.branch || status?.branch || "..."}
            repoPath={repoPath}
            onBranchChanged={fetchStatus}
          >
            <div className="flex items-center gap-1.5 cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all group/branch">
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground group-hover/branch:text-primary transition-colors" />
              <span className="text-sm font-bold truncate text-foreground">
                {gitStatus?.branch || status?.branch || "..."}
              </span>
            </div>
          </BranchSwitcher>
        </div>

        {/* Right: Actions Row (Refresh, Pull, Push) */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2 border-l border-border pl-1.5">
          {lastUpdatedText && (
            <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline opacity-50">
              {lastUpdatedText}
            </span>
          )}
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className={`p-1.5 hover:bg-secondary rounded-full ${refreshing ? "animate-spin" : ""} text-muted-foreground hover:text-foreground transition-colors`}
            title="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePull}
            disabled={loading}
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-secondary/80 rounded text-[10px] font-semibold transition-colors text-muted-foreground hover:text-foreground"
            title="Pull Changes"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>{gitStatus?.behind ?? status?.behind ?? 0}</span>
          </button>
          <button
            onClick={handlePush}
            disabled={loading}
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-secondary/80 rounded text-[10px] font-semibold transition-colors text-muted-foreground hover:text-foreground"
            title="Push Changes"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>{gitStatus?.ahead ?? status?.ahead ?? 0}</span>
          </button>
        </div>
      </div>

      {/* 2. Commit Section */}
      <div className="p-3 border-b border-border flex flex-col gap-3 bg-secondary/5">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
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
      <div className="flex-1 overflow-y-auto p-0 min-w-0">
        {/* STAGED FILES GROUP */}
        <ChangeGroup
          title={`Staged Changes (${stagedFiles.length})`}
          count={stagedFiles.length}
          color={themeColor.dot}
        >
          {stagedFiles.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-muted-foreground/50 italic">
              No staged changes
            </div>
          ) : (
            <FileGroupList
              files={stagedFiles}
              selectedFile={selectedFile}
              onSelect={onSelectFile}
              onAction={handleUnstage}
              actionIcon={Minus}
              actionTitle="Unstage"
              dotClass={themeColor.dot}
              actionButtonClass="hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500"
            />
          )}
        </ChangeGroup>

        {/* UNSTAGED FILES GROUP */}
        <ChangeGroup
          title={`Changes (${unstagedFiles.length})`}
          count={unstagedFiles.length}
          color={themeColor.dot}
        >
          {unstagedFiles.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-muted-foreground/50 italic">
              No changes
            </div>
          ) : (
            <FileGroupList
              files={unstagedFiles}
              selectedFile={selectedFile}
              onSelect={onSelectFile}
              onAction={handleStage}
              actionIcon={Plus}
              actionTitle="Stage"
              dotClass={themeColor.dot}
              actionButtonClass="hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-500"
            />
          )}
        </ChangeGroup>

        {/* LOCAL COMMITS GROUPS */}
        {status?.localCommits && status.localCommits.length > 0 && (
          <>
            {status.localCommits.map((commit) => (
              <ChangeGroup
                key={commit.hash}
                title={`${commit.message.split("\n")[0]} (${commit.files ? commit.files.length : 0})`}
                count={commit.files ? commit.files.length : 0}
                color="bg-purple-500"
                defaultOpen={false}
                uppercase={false}
              >
                <div className="px-3 w-full max-w-full min-w-0">
                  {/* Commit Details Header */}
                  <div className="mb-2 px-2 text-[10px] text-muted-foreground flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded-full">
                      <GitCommit className="w-3 h-3" />
                      <span className="font-mono">
                        {commit.hash.substring(0, 7)}
                      </span>
                    </div>
                    <span>{commit.date}</span>
                    <span className="truncate max-w-[100px]">
                      {commit.author}
                    </span>
                  </div>

                  {commit.files && (
                    <FileGroupList
                      files={commit.files.map((file) => ({
                        ...file,
                        commitHash: commit.hash,
                      }))}
                      selectedFile={selectedFile}
                      onSelect={onSelectFile}
                      actionIcon={Check}
                      actionTitle="Committed"
                      dotClass="bg-purple-500"
                      actionButtonClass="hidden"
                    />
                  )}
                </div>
              </ChangeGroup>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
