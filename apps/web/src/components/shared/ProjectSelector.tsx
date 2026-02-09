"use client";

import * as React from "react";
import {
  Circle,
  ChevronDown,
  Search,
  Folder,
  LayoutGrid,
  Settings2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Card,
  CardContent,
  Input,
  ScrollArea,
  cn,
  Badge,
  Button,
} from "@agelum/shadcn";

interface Repository {
  name: string;
  path: string;
  folderConfigId?: string;
}

interface ProjectStatus {
  isRunning: boolean;
  isManaged: boolean;
  pid: number | null;
}

interface BranchInfo {
  currentBranch: string | null;
}

interface ProjectSelectorProps {
  repositories: Repository[];
  selectedRepo: string | null;
  onSelect: (repoName: string) => void;
  className?: string;
  currentViewMode?: string;
  onBrowserScreenshot?: (screenshot: string | null) => void;
  isLoading?: boolean;
}

export function ProjectSelector({
  repositories,
  selectedRepo,
  onSelect,
  className,
  currentViewMode,
  onBrowserScreenshot,
  isLoading = false,
}: ProjectSelectorProps) {
  const [
    projectStatuses,
    setProjectStatuses,
  ] = React.useState<
    Record<string, ProjectStatus>
  >({});
  const [
    branchInfo,
    setBranchInfo,
  ] = React.useState<BranchInfo>({
    currentBranch: null,
  });
  const [search, setSearch] =
    React.useState("");
  const [open, setOpen] =
    React.useState(false);
  const [viewModeWhenOpened, setViewModeWhenOpened] = React.useState<string | null>(null);

  // Fetch status for all visible repositories when open
  const fetchAllStatus =
    React.useCallback(async () => {
      try {
        const fetchRepoStatus = async (
          repoName: string,
        ) => {
          try {
            const res = await fetch(
              `/api/app-status?repo=${encodeURIComponent(repoName)}`,
            );
            if (res.ok) {
              const data =
                await res.json();
              setProjectStatuses(
                (prev) => ({
                  ...prev,
                  [repoName]: {
                    isRunning:
                      data.isRunning ||
                      false,
                    isManaged:
                      data.isManaged ||
                      false,
                    pid:
                      data.pid || null,
                  },
                }),
              );
            }
          } catch (e) {}
        };

        await Promise.all(
          repositories.map((repo) =>
            fetchRepoStatus(repo.name),
          ),
        );
      } catch (error) {
        console.error(
          "Failed to fetch all statuses:",
          error,
        );
      }
    }, [repositories]);

  React.useEffect(() => {
    if (open) {
      fetchAllStatus();
    }
  }, [open, fetchAllStatus]);

  React.useEffect(() => {
    if (!selectedRepo) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/app-status?repo=${encodeURIComponent(selectedRepo)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setProjectStatuses(
            (prev) => ({
              ...prev,
              [selectedRepo]: {
                isRunning:
                  data.isRunning ||
                  false,
                isManaged:
                  data.isManaged ||
                  false,
                pid: data.pid || null,
              },
            }),
          );
        }
      } catch (error) {}
    };

    const fetchBranch = async () => {
      try {
        const repo = repositories.find(r => r.name === selectedRepo);
        if (!repo) return;
        
        const res = await fetch(
          `/api/git?path=${encodeURIComponent(repo.path)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setBranchInfo({
            currentBranch: data.branch || null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch branch:', error);
      }
    };

    fetchStatus();
    fetchBranch();
  }, [selectedRepo, repositories]);

  const filteredRepos =
    repositories.filter((repo) =>
      repo.name
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  // Hide Electron browser view when popover is open
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.browserView) {
      const browserView = window.electronAPI.browserView;
      if (open) {
        // Remember which view mode we were in
        setViewModeWhenOpened(currentViewMode || null);
        
        // Capture screenshot before hiding (only if we're on browser tab)
        if (currentViewMode === 'browser' && onBrowserScreenshot) {
          browserView.capture().then((screenshot) => {
            if (screenshot) {
              onBrowserScreenshot(screenshot);
            }
            browserView.hide();
          }).catch(() => {
            browserView.hide();
          });
        } else {
          browserView.hide();
        }
      } else {
        // Only show browser if we were on the browser tab when we opened the selector
        if (viewModeWhenOpened === 'browser') {
          browserView.show();
        }
        // Clear the screenshot after closing
        if (onBrowserScreenshot) {
          onBrowserScreenshot(null);
        }
        setViewModeWhenOpened(null);
      }
    }
  }, [open, currentViewMode, onBrowserScreenshot, viewModeWhenOpened]);

  return (
    <>
      {/* Backdrop overlay - covers everything below header */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          style={{ top: '80px' }} // Starts exactly below the header
          onClick={() => setOpen(false)}
        />
      )}
      
      <div
        className={cn(
          "relative flex items-center",
          className,
        )}
      >
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-14 px-3 hover:bg-white/10 flex items-center gap-2 transition-all group rounded-2xl border border-transparent hover:border-white/10"
          >
            <div className="flex flex-col items-end pt-4">
              <span className="font-semibold text-zinc-100 group-hover:text-white transition-colors text-sm">
                {isLoading ? "Loading..." : (selectedRepo ||
                  "Select Project")}
              </span>
              {!isLoading && branchInfo.currentBranch && (
                <span className="text-[10px] text-zinc-500 font-normal">
                  {branchInfo.currentBranch}
                </span>
              )}
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
            ) : (
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-all duration-300",
                  open && "rotate-180",
                )}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[640px] p-0 border-white/[0.08] bg-zinc-950 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] rounded-[24px] overflow-hidden backdrop-blur-3xl ring-1 ring-white/10 z-50"
          align="start"
          sideOffset={12}
        >
          {/* Header */}
          <div className="p-6 pb-4 flex flex-col gap-4 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-zinc-400" />
                  Projects
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Switch between your
                  active workspaces
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-white/5 border-white/5 text-zinc-400 text-[10px] uppercase tracking-widest px-2 py-0.5"
              >
                {repositories.length}{" "}
                Found
              </Badge>
            </div>

            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <Input
                placeholder="Search projects by name..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
                className="pl-11 h-11 bg-white/[0.03] border-white/[0.06] focus-visible:ring-0 focus-visible:border-white/20 transition-all rounded-2xl text-white placeholder:text-zinc-600 shadow-inner"
                autoFocus
              />
            </div>
          </div>

          {/* Grid Area */}
          <ScrollArea className="h-[460px] px-6">
            <div className="grid grid-cols-2 gap-4 pb-6">
              {isLoading ? (
                <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-lg">
                    <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-zinc-400">
                      Loading projects...
                    </p>
                    <p className="text-xs text-zinc-600">
                      Please wait while we fetch your workspaces
                    </p>
                  </div>
                </div>
              ) : filteredRepos.length ===
              0 ? (
                <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-lg">
                    <Search className="h-6 w-6 text-zinc-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-zinc-400">
                      No projects match
                      your search
                    </p>
                    <p className="text-xs text-zinc-600">
                      Try checking for
                      typos or searching
                      with a different
                      keyword
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSearch("")
                    }
                    className="mt-2 bg-white/5 border-white/10 text-zinc-400 hover:text-white rounded-xl"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                filteredRepos.map(
                  (repo) => {
                    const status =
                      projectStatuses[
                        repo.name
                      ];
                    const isSelected =
                      repo.name ===
                      selectedRepo;
                    const isRunning =
                      status?.isRunning;

                    return (
                      <div
                        key={repo.name}
                        className="group/item relative"
                        onClick={() => {
                          onSelect(
                            repo.name,
                          );
                          setOpen(
                            false,
                          );
                        }}
                      >
                        <Card
                          className={cn(
                            "relative h-[110px] overflow-hidden cursor-pointer transition-all duration-500 border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] active:scale-[0.97] rounded-[20px]",
                            isSelected &&
                              "bg-white/[0.06] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/10",
                          )}
                        >
                          <CardContent className="p-4 h-full flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-10 w-10 flex items-center justify-center rounded-[14px] transition-all duration-300",
                                    isSelected
                                      ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                      : "bg-white/[0.05] text-zinc-500 group-hover/item:text-zinc-200 group-hover/item:bg-white/[0.08]",
                                  )}
                                >
                                  {repo.folderConfigId ? (
                                    <Folder className="h-5 w-5" />
                                  ) : (
                                    <LayoutGrid className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className={cn(
                                      "text-[14px] font-bold truncate leading-none mb-1",
                                      isSelected
                                        ? "text-white"
                                        : "text-zinc-400 group-hover/item:text-white",
                                    )}
                                  >
                                    {
                                      repo.name
                                    }
                                  </span>
                                  <span className="text-[10px] text-zinc-600 truncate font-mono tracking-wider">
                                    {repo.path
                                      .split(
                                        "/",
                                      )
                                      .pop()}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="h-5 w-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors",
                                  isRunning
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-600",
                                )}
                              >
                                <div
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    isRunning
                                      ? "bg-emerald-400 animate-pulse"
                                      : "bg-zinc-700",
                                  )}
                                />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                  {isRunning
                                    ? "Active"
                                    : "Idle"}
                                </span>
                              </div>

                              <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-600 hover:text-white transition-all opacity-0 group-hover/item:opacity-100">
                                <Settings2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </CardContent>

                          {/* Glow effects */}
                          {isSelected && (
                            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
                          )}
                        </Card>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {[...Array(3)].map(
                  (_, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border border-zinc-950 bg-zinc-800 ring-1 ring-white/5 flex items-center justify-center"
                    >
                      <Circle className="h-1 w-1 fill-zinc-600" />
                    </div>
                  ),
                )}
              </div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                Team Workspace
              </span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-bold text-zinc-400 hover:text-white transition-colors no-underline"
            >
              Add New Project{" "}
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
    </>
  );
}
