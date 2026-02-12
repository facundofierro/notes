import * as React from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import FileBrowser from "@/components/features/file-system/FileBrowser";
import FileViewer from "@/components/features/file-system/FileViewer";
import DiskUsageChart from "@/components/shared/DiskUsageChart";
import { AIRightSidebar } from "@/components/layout/AIRightSidebar";
import { LocalChangesPanel } from "@/components/features/git/LocalChangesPanel";
import { GitHubPRsPanel } from "@/components/features/git/GitHubPRsPanel";
import { DiffView } from "@/components/features/git/DiffView";
import { useHomeStore } from "@/store/useHomeStore";
import {
  Folder,
  GitBranch,
  Github,
  Plus,
  X,
  Layers,
  Bot,
  FileDiff,
  Info,
  RefreshCw,
  GitMerge,
  Check,
} from "lucide-react";
import { cn, Button } from "@agelum/shadcn";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  size?: number;
}

type LeftSidebarView = "files" | "changes" | "prs";
type ChangesTab = "agent" | "diff";
type PRsTab = "info" | "diff";

// --- Sub-components for Central Areas ---

// 1. Files View Central Area
const FilesCentralArea = ({
  selectedFile,
  selectedFolder,
  onSaveFile,
  loadFileTree,
  tabs,
  activeTabId,
  setActiveTabId,
  removeTab,
  addTab,
}: any) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Existing Dynamic Tabs Header for Files View */}
      <div className="flex border-b border-border bg-secondary/10 items-center overflow-x-auto no-scrollbar">
        {tabs.map((tab: any) => {
          const Icon = tab.icon;
          let label = tab.label;
          if (activeTabId === tab.id) {
            if (selectedFile)
              label = selectedFile.path.split("/").pop() || label;
            else if (selectedFolder) label = selectedFolder.name || label;
          }

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-border transition-colors min-w-[120px] max-w-[200px] group",
                activeTabId === tab.id
                  ? "text-blue-500 bg-blue-500/10 font-medium"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span className="truncate flex-1">{label}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => removeTab(e, tab.id)}
                  className="p-0.5 rounded-sm hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={addTab}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Add Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {selectedFile ? (
          <div className="flex flex-col h-full">
            <FileViewer
              file={selectedFile}
              onSave={onSaveFile}
              onFileSaved={loadFileTree}
            />
          </div>
        ) : selectedFolder ? (
          <div className="flex flex-col h-full">
            <DiskUsageChart node={selectedFolder} />
          </div>
        ) : (
          <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
            Select a file or folder
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Local Changes Central Area
const ChangesCentralArea = ({
  selectedGitFile,
  diffOriginal,
  diffModified,
}: any) => {
  const [activeTab, setActiveTab] = React.useState<ChangesTab>("agent");

  // Auto-switch to diff tab if a file is selected
  React.useEffect(() => {
    if (selectedGitFile) {
      setActiveTab("diff");
    }
  }, [selectedGitFile]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Fixed Tabs Header */}
      <div className="flex border-b border-border bg-secondary/10 items-center">
        <button
          onClick={() => setActiveTab("agent")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "agent"
              ? "text-blue-500 bg-blue-500/10 font-medium"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent Review</span>
        </button>
        <button
          onClick={() => setActiveTab("diff")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "diff"
              ? "text-blue-500 bg-blue-500/10 font-medium"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>Diff View</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {activeTab === "agent" ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">AI Agent Review</h3>
            <p className="max-w-md text-sm opacity-80">
              Run specialized agents to review your local changes for bugs,
              security issues, and code quality improvements.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-lg">
              <div className="p-4 border border-border rounded-lg bg-secondary/5 text-left">
                <div className="font-medium mb-1 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Security Audit
                </div>
                <div className="text-xs opacity-70">
                  Check for vulnerabilities in your changes
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg bg-secondary/5 text-left">
                <div className="font-medium mb-1 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>Code
                  Quality
                </div>
                <div className="text-xs opacity-70">
                  Linting and best practices review
                </div>
              </div>
            </div>
          </div>
        ) : selectedGitFile ? (
          <DiffView
            original={diffOriginal}
            modified={diffModified}
            className="bg-background"
            language={
              selectedGitFile.path?.endsWith(".ts") ||
              selectedGitFile.path?.endsWith(".tsx")
                ? "typescript"
                : "plaintext"
            }
          />
        ) : (
          <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
            Select a file to view diff
          </div>
        )}
      </div>
    </div>
  );
};

// 3. GitHub PRs Central Area
const PRsCentralArea = ({
  selectedPRFile,
  diffOriginal,
  diffModified,
  prDetails,
  onCheckout,
  isCheckingOut,
  onMerge,
  onClose,
  actionLoading,
  showCheckoutOverlay,
}: any) => {
  const [activeTab, setActiveTab] = React.useState<PRsTab>("info");

  // Auto-switch to diff tab if a file is selected
  React.useEffect(() => {
    if (selectedPRFile) {
      setActiveTab("diff");
    }
  }, [selectedPRFile]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Fixed Tabs Header */}
      <div className="flex border-b border-border bg-secondary/10 items-center">
        <button
          onClick={() => setActiveTab("info")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "info"
              ? "text-blue-500 bg-blue-500/10 font-medium"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          <Info className="w-3.5 h-3.5" />
          <span>PR Info</span>
        </button>
        <button
          onClick={() => setActiveTab("diff")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "diff"
              ? "text-blue-500 bg-blue-500/10 font-medium"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>Diff View</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {activeTab === "info" ? (
          prDetails ? (
            <div className="flex flex-col h-full overflow-y-auto p-6">
              <div className="border-b border-border pb-4 mb-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{prDetails.title}</h1>
                    <span className="text-muted-foreground font-mono text-sm">
                      #{prDetails.number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => onCheckout && onCheckout(prDetails.number)}
                      disabled={isCheckingOut === prDetails.number}
                    >
                      {isCheckingOut === prDetails.number ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Checkout
                    </Button>
                    {prDetails.state === "OPEN" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-500/10 border-green-500/20"
                          onClick={() => onMerge && onMerge(prDetails.number)}
                          disabled={
                            !!actionLoading ||
                            prDetails.mergeable === "CONFLICTING"
                          }
                          title={
                            prDetails.mergeable === "CONFLICTING"
                              ? "Conflicts must be resolved"
                              : "Merge Pull Request"
                          }
                        >
                          {actionLoading === "merge" ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <GitMerge className="w-3.5 h-3.5" />
                          )}
                          Merge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/20"
                          onClick={() => onClose && onClose(prDetails.number)}
                          disabled={!!actionLoading}
                          title="Close Pull Request"
                        >
                          {actionLoading === "close" ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Close
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      {prDetails.author.login}
                    </span>
                    <span>wants to merge into</span>
                    <code className="bg-muted px-1 rounded">
                      {prDetails.baseRefName}
                    </code>
                    <span>from</span>
                    <code className="bg-muted px-1 rounded">
                      {prDetails.headRefName}
                    </code>
                  </div>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none w-full">
                {prDetails.body ? (
                  <MarkdownPreview
                    source={prDetails.body}
                    style={{ backgroundColor: "transparent", color: "inherit" }}
                    wrapperElement={{ "data-color-mode": "dark" }}
                  />
                ) : (
                  <span className="italic opacity-50">
                    No description provided.
                  </span>
                )}
              </div>

              {prDetails.reviews && prDetails.reviews.length > 0 && (
                <div className="mt-8 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-3">Reviews</h3>
                  <div className="space-y-2">
                    {prDetails.reviews.map((r: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 border border-border rounded bg-secondary/5"
                      >
                        <span className="text-sm font-medium">
                          {r.author.login}
                        </span>
                        {/* Reusing badge styles from PR Panel roughly */}
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border",
                            r.state === "APPROVED"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {r.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <Github className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">
                Select a Pull Request
              </h3>
              <p className="max-w-md text-sm opacity-80">
                Choose a PR from the sidebar to view details and changes.
              </p>
            </div>
          )
        ) : selectedPRFile ? (
          showCheckoutOverlay ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-background/50">
              <div className="max-w-md space-y-4 flex flex-col items-center">
                <p className="font-medium text-foreground">
                  To see the full specific diff, please Checkout the PR.
                </p>
                <p className="text-xs opacity-70 max-w-[300px] leading-relaxed">
                  Remote file content fetching is not yet implemented without
                  checkout.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    prDetails && onCheckout && onCheckout(prDetails.number)
                  }
                  disabled={isCheckingOut === prDetails?.number}
                >
                  {isCheckingOut === prDetails?.number ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <GitBranch className="w-3.5 h-3.5 mr-2" />
                  )}
                  Checkout PR #{prDetails?.number}
                </Button>
              </div>
            </div>
          ) : (
            <DiffView
              original={diffOriginal}
              modified={diffModified}
              className="bg-background"
              language={
                selectedPRFile.path?.endsWith(".ts") ||
                selectedPRFile.path?.endsWith(".tsx")
                  ? "typescript"
                  : "plaintext"
              }
            />
          )
        ) : (
          <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
            Select a file in PR to view diff
          </div>
        )}
      </div>
    </div>
  );
};

export function ReviewTab() {
  const store = useHomeStore();
  const {
    selectedRepo,
    basePath,
    repositories,
    settings,
    setSelectedFile,
    handleFileSelect,
    handleRunTest,
    saveFile,
    agentTools,
  } = store;

  const projectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)?.path ||
      settings.projects?.find((p) => p.name === selectedRepo)?.path ||
      null
    );
  }, [repositories, selectedRepo, settings.projects]);

  const {
    selectedFile,
    currentPath,
    viewMode,
    workDocIsDraft,
    testViewMode,
    testOutput,
    isTestRunning,
  } = store.getProjectState();

  const [fileTree, setFileTree] = React.useState<FileNode | null>(null);
  const [leftSidebarView, setLeftSidebarView] =
    React.useState<LeftSidebarView>("files");

  // -- Files View State --
  const [tabs, setTabs] = React.useState<any[]>([
    { id: "main", label: "Project", icon: Layers },
  ]);
  const [activeTabId, setActiveTabId] = React.useState("main");
  const [selectedFolder, setSelectedFolder] = React.useState<FileNode | null>(
    null,
  );

  // -- Changes View State --
  const [selectedGitFile, setSelectedGitFile] = React.useState<any | null>(
    null,
  );
  const [changesDiffOriginal, setChangesDiffOriginal] = React.useState("");
  const [changesDiffModified, setChangesDiffModified] = React.useState("");

  // -- PRs View State --
  const [activePRDetails, setActivePRDetails] = React.useState<any | null>(
    null,
  );
  const [selectedPRFile, setSelectedPRFile] = React.useState<any | null>(null);
  const [prDiffOriginal, setPRDiffOriginal] = React.useState("");
  const [prDiffModified, setPRDiffModified] = React.useState("");
  const [checkoutLoading, setCheckoutLoading] = React.useState<number | null>(
    null,
  );
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = React.useState(false);

  // -- Resizable Sidebar State --
  const [sidebarWidth, setSidebarWidth] = React.useState(320);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX; // Assuming sidebar starts at 0
        if (newWidth > 150 && newWidth < 800) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}&root=true`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
          // If no folder selected and no file selected, select root folder by default
          if (!selectedFolder && !selectedFile && data.tree) {
            setSelectedFolder(data.tree);
          }
        });
    }
  }, [selectedRepo, selectedFile, selectedFolder]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Handle Git File Select for Changes View
  const handleGitFileSelect = async (file: any) => {
    setSelectedGitFile(file);
    // ... (fetched content logic reused or abstracted)
    if (projectPath) {
      let refOriginal = "HEAD";
      let refModified: string | undefined = undefined;

      if (file.commitHash) {
        refOriginal = `${file.commitHash}~1`;
        refModified = file.commitHash;
      }

      try {
        const resOrig = await fetch(
          `/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(refOriginal)}`,
        );
        if (resOrig.ok) {
          const data = await resOrig.json();
          setChangesDiffOriginal(data.content || "");
        } else {
          setChangesDiffOriginal("");
        }
      } catch {
        setChangesDiffOriginal("");
      }

      try {
        if (refModified) {
          const resMod = await fetch(
            `/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(refModified)}`,
          );
          if (resMod.ok) {
            const data = await resMod.json();
            setChangesDiffModified(data.content || "");
          } else {
            setChangesDiffModified("");
          }
        } else {
          const absolutePath = `${projectPath}/${file.path}`.replace(
            /\/+/g,
            "/",
          );
          const resModContent = await fetch(
            `/api/file?path=${encodeURIComponent(absolutePath)}`,
          ).then((r) => r.json());
          setChangesDiffModified(resModContent.content || "");
        }
      } catch {
        setChangesDiffModified("");
      }
    }
  };

  // Handle PR File Select
  const handlePRFileSelect = async (file: any) => {
    setSelectedPRFile(file);
    setPRDiffOriginal("");
    setPRDiffModified("");
    setShowCheckoutOverlay(false);

    if (projectPath && activePRDetails) {
      const baseRef = activePRDetails.baseRefName; // target branch (e.g. main)
      const headRef = activePRDetails.headRefName; // source branch (e.g. dev)

      // Check current branch to decide if we need checkout
      let currentBranch = "";
      try {
        const branchRes = await fetch(
          `/api/github?action=current-branch&path=${encodeURIComponent(projectPath)}`,
        );
        if (branchRes.ok) {
          const branchData = await branchRes.json();
          currentBranch = branchData.branch || "";
        }
      } catch (e) {
        console.error("Failed to get current branch:", e);
      }

      const isOnPRBranch = currentBranch === headRef;

      // 1. Fetch Original Content (Base)
      try {
        const resOrig = await fetch(
          `/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(baseRef)}`,
        );
        if (resOrig.ok) {
          const data = await resOrig.json();
          setPRDiffOriginal(data.content || "");
        } else {
          setPRDiffOriginal(
            `// Could not fetch original content for ${file.path} from base ref '${baseRef}'.\n// Ensure you have fetched origin.`,
          );
        }
      } catch (e) {
        setPRDiffOriginal(
          `// Error fetching original content for ${file.path}`,
        );
      }

      // 2. Fetch Modified Content (Head)
      if (isOnPRBranch) {
        // We're on the PR branch, fetch from local working copy
        try {
          const absolutePath = `${projectPath}/${file.path}`.replace(
            /\/+/g,
            "/",
          );
          const resModContent = await fetch(
            `/api/file?path=${encodeURIComponent(absolutePath)}`,
          );
          if (resModContent.ok) {
            const modData = await resModContent.json();
            setPRDiffModified(modData.content || "");
          } else {
            // Try fetching from the head ref instead
            const resHead = await fetch(
              `/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(headRef)}`,
            );
            if (resHead.ok) {
              const headData = await resHead.json();
              setPRDiffModified(headData.content || "");
            } else {
              setPRDiffModified(
                `// Could not fetch modified content for ${file.path}`,
              );
            }
          }
        } catch (e) {
          setPRDiffModified(
            `// Error fetching modified content for ${file.path}`,
          );
        }
      } else {
        // Not on the PR branch, show checkout overlay
        setShowCheckoutOverlay(true);
      }
    }
  };

  const handleCheckout = async (prNumber: number) => {
    if (!projectPath) return;
    setCheckoutLoading(prNumber);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "checkout",
          repoPath: projectPath,
          prNumber: prNumber,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
      } else {
        // Refresh everything?
        loadFileTree();
        // If we successfully checkout, we can now likely show the diff content if we refresh.
        // Re-selecting the file might trigger logical update if needed, but for now user can just re-click.
        // Actually, let's just hide the overlay if it was open, though we might still need to fetch content.
        // Best UX: re-trigger retrieval.
        if (selectedPRFile) {
          // Slight delay to ensure git ops are done?
          setTimeout(() => handlePRFileSelect(selectedPRFile), 500);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleMerge = async (prNumber: number) => {
    if (!projectPath) return;
    if (!confirm("Are you sure you want to merge this PR?")) return;
    setActionLoading("merge");
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "merge",
          repoPath: projectPath,
          prNumber,
        }),
      });
      if (!res.ok) throw new Error("Failed to merge");

      // Refresh details if this is the active PR
      if (activePRDetails?.number === prNumber) {
        const detailsRes = await fetch(
          `/api/github?action=details&path=${encodeURIComponent(projectPath)}&pr=${prNumber}`,
        );
        if (detailsRes.ok) {
          const data = await detailsRes.json();
          setActivePRDetails(data.pr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (prNumber: number) => {
    if (!projectPath) return;
    if (!confirm("Are you sure you want to close this PR?")) return;
    setActionLoading("close");
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "close",
          repoPath: projectPath,
          prNumber,
        }),
      });
      if (!res.ok) throw new Error("Failed to close");

      // Refresh details
      if (activePRDetails?.number === prNumber) {
        const detailsRes = await fetch(
          `/api/github?action=details&path=${encodeURIComponent(projectPath)}&pr=${prNumber}`,
        );
        if (detailsRes.ok) {
          const data = await detailsRes.json();
          setActivePRDetails(data.pr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveFileShim = async ({ content }: { content: string }) => {
    if (!selectedFile) return;
    await saveFile({ path: selectedFile.path, content });
  };

  // Files View Tab Handlers
  const removeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const addTab = () => {
    const newId = `tab-${Date.now()}`;
    setTabs([...tabs, { id: newId, label: "New Tab" }]);
    setActiveTabId(newId);
  };

  const onFileSelectWrapper = (node: FileNode) => {
    handleFileSelect(node);
    setSelectedFolder(null); // Clear folder selection in files view
  };

  const onFolderSelectWrapper = (node: FileNode) => {
    setSelectedFolder(node);
    setSelectedFile(null); // Clear file selection in files view
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-background">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "flex flex-col overflow-hidden bg-secondary/5 relative group/sidebar",
          leftSidebarView ? "border-r border-border" : "",
        )}
        style={{
          width: leftSidebarView ? sidebarWidth : 0,
          transition: isResizing ? "none" : "width 0.2s",
        }}
      >
        {/* Navigation Header */}
        <div className="flex items-center border-b border-border bg-background/50">
          <button
            onClick={() => setLeftSidebarView("files")}
            className={cn(
              "flex-1 flex items-center justify-center py-3 transition-colors border-b-2",
              leftSidebarView === "files"
                ? "border-blue-500 text-blue-500 bg-blue-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
            )}
            title="Project Files"
          >
            <Folder className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLeftSidebarView("changes")}
            className={cn(
              "flex-1 flex items-center justify-center py-3 transition-colors border-b-2",
              leftSidebarView === "changes"
                ? "border-blue-500 text-blue-500 bg-blue-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
            )}
            title="Local Changes"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLeftSidebarView("prs")}
            className={cn(
              "flex-1 flex items-center justify-center py-3 transition-colors border-b-2",
              leftSidebarView === "prs"
                ? "border-blue-500 text-blue-500 bg-blue-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
            )}
            title="GitHub PRs"
          >
            <Github className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Content - Rendered all 3 with display toggle */}
        <div className="flex-1 overflow-hidden relative min-w-0">
          <div
            className={cn(
              "h-full w-full min-w-0",
              leftSidebarView === "files" ? "block" : "hidden",
            )}
          >
            <FileBrowser
              fileTree={fileTree}
              currentPath={currentPath}
              onFileSelect={onFileSelectWrapper}
              onFolderSelect={onFolderSelectWrapper}
              basePath={basePath}
              onRefresh={loadFileTree}
              resizable={false}
            />
          </div>

          <div
            className={cn(
              "h-full w-full flex flex-col min-w-0",
              leftSidebarView === "changes" ? "flex" : "hidden",
            )}
          >
            {projectPath ? (
              <LocalChangesPanel
                repoPath={projectPath}
                projectName={selectedRepo || "Project"}
                onSelectFile={handleGitFileSelect}
                selectedFile={selectedGitFile?.path}
                className="flex-1"
              />
            ) : (
              <div className="p-4 text-xs text-muted-foreground">
                Select a repository first
              </div>
            )}
          </div>

          <div
            className={cn(
              "h-full w-full flex flex-col min-w-0",
              leftSidebarView === "prs" ? "flex" : "hidden",
            )}
          >
            {projectPath ? (
              <GitHubPRsPanel
                repoPath={projectPath}
                onPRSelect={setActivePRDetails}
                onSelectFile={handlePRFileSelect}
                selectedFile={selectedPRFile?.path}
                onCheckout={handleCheckout}
                isCheckingOut={checkoutLoading}
                onMerge={handleMerge}
                onClose={handleClose}
                actionLoading={actionLoading}
              />
            ) : (
              <div className="p-4 text-xs text-muted-foreground">
                Select a repository first
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        {leftSidebarView && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-50"
            onMouseDown={startResizing}
          />
        )}
      </div>

      {/* Central Content Areas - Rendered ALL 3 times as requested */}

      {/* 1. Files View Central Area */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden h-full",
          leftSidebarView === "files" ? "flex" : "hidden",
        )}
      >
        <FilesCentralArea
          selectedFile={selectedFile}
          selectedFolder={selectedFolder}
          onSaveFile={handleSaveFileShim}
          loadFileTree={loadFileTree}
          tabs={tabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          removeTab={removeTab}
          addTab={addTab}
        />
      </div>

      {/* 2. Changes View Central Area */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden h-full",
          leftSidebarView === "changes" ? "flex" : "hidden",
        )}
      >
        <ChangesCentralArea
          selectedGitFile={selectedGitFile}
          diffOriginal={changesDiffOriginal}
          diffModified={changesDiffModified}
        />
      </div>

      {/* 3. PRs View Central Area */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden h-full",
          leftSidebarView === "prs" ? "flex" : "hidden",
        )}
      >
        <PRsCentralArea
          selectedPRFile={selectedPRFile}
          diffOriginal={prDiffOriginal}
          diffModified={prDiffModified}
          prDetails={activePRDetails}
          onCheckout={handleCheckout}
          isCheckingOut={checkoutLoading}
          onMerge={handleMerge}
          onClose={handleClose}
          actionLoading={actionLoading}
          showCheckoutOverlay={showCheckoutOverlay}
        />
      </div>

      {/* Right Sidebar - AI Assistant */}
      <AIRightSidebar
        selectedRepo={selectedRepo}
        basePath={basePath}
        projectPath={projectPath}
        agentTools={agentTools}
        viewMode={viewMode}
        file={selectedFile}
        workDocIsDraft={workDocIsDraft}
        testViewMode={testViewMode}
        testOutput={testOutput}
        isTestRunning={isTestRunning}
        onRunTest={handleRunTest}
        contextKey={selectedFile ? `review:${selectedFile.path}` : "review"}
      />
    </div>
  );
}
