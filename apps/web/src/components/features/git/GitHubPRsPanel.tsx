import * as React from "react";
import { 
    GitPullRequest, 
    RefreshCw, 
    ArrowRight, 
    Check, 
    AlertCircle, 
    Plus, 
    Clock, 
    MessageSquare, 
    FileText, 
    ChevronLeft,
    ExternalLink,
    XCircle,
    CheckCircle2,
    MinusCircle,
    ChevronRight,
} from "lucide-react";
import { Button, ScrollArea, Skeleton, Badge, cn, Tabs, TabsList, TabsTrigger, TabsContent } from "@agelum/shadcn";
import { CreatePRDialog } from "./CreatePRDialog";
import { GitFile, ChangeGroup, FileItem, FileGroupList, groupFilesByFolder, truncatePath } from "./GitSharedComponents";

interface PR {
  number: number;
  title: string;
  author: { login: string };
  updatedAt: string;
  url: string;
  state: string;
  headRefName: string;
  baseRefName: string;
  reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED";
  statusCheckRollup?: {
      state: "SUCCESS" | "FAILURE" | "PENDING";
  };
}

interface PRDetails extends PR {
    body: string;
    comments: {
        totalCount: number;
    };
    reviews?: {
        author: { login: string };
        state: string;
    }[];
    files: Array<{
        path: string;
        additions: number;
        deletions: number;
    }>;
}

interface GitHubPRsPanelProps {
  repoPath: string;
  onPRSelect?: (pr: PRDetails | null) => void;
  selectedPRNumber?: number | null;
  onSelectPRNumber?: (n: number | null) => void;
  onBack?: () => void;
  onSelectFile?: (file: GitFile) => void;
  selectedFile?: string | null;
}

export function GitHubPRsPanel({ 
    repoPath, 
    onPRSelect, 
    selectedPRNumber: externalSelectedPRNumber, 
    onSelectPRNumber,
    onBack,
    onSelectFile,
    selectedFile
}: GitHubPRsPanelProps) {
  const [prs, setPrs] = React.useState<PR[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  
  // Internal state if not controlled
  const [internalSelectedPRNumber, setInternalSelectedPRNumber] = React.useState<number | null>(null);
  const selectedPRNumber = externalSelectedPRNumber !== undefined ? externalSelectedPRNumber : internalSelectedPRNumber;

  const [prDetails, setPrDetails] = React.useState<PRDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);

  const fetchPRs = React.useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github?action=list&path=${encodeURIComponent(repoPath)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch PRs");
      }
      const data = await res.json();
      setPrs(data.prs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  const fetchPRDetails = React.useCallback(async (number: number) => {
      setDetailsLoading(true);
      setPrDetails(null);
      if (onPRSelect) onPRSelect(null);

      try {
        const res = await fetch(`/api/github?action=details&path=${encodeURIComponent(repoPath)}&pr=${number}`);
        if (!res.ok) throw new Error("Failed to fetch details");
        const data = await res.json();
        setPrDetails(data.pr);
        if (onPRSelect) onPRSelect(data.pr);
      } catch (err) {
          console.error(err);
      } finally {
          setDetailsLoading(false);
      }
  }, [repoPath, onPRSelect]);

  React.useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  React.useEffect(() => {
    if (selectedPRNumber) {
        fetchPRDetails(selectedPRNumber);
    } else {
        setPrDetails(null);
        if (onPRSelect) onPRSelect(null);
    }
  }, [selectedPRNumber, fetchPRDetails]);

  const handleCheckout = async (prNumber: number) => {
    setCheckoutLoading(prNumber);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "checkout",
          repoPath,
          prNumber: prNumber,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to checkout PR");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getStatusIcon = (state?: "SUCCESS" | "FAILURE" | "PENDING") => {
      if (state === "SUCCESS") return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      if (state === "FAILURE") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      if (state === "PENDING") return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      return null;
  };

  const getReviewBadge = (decision?: string) => {
      if (decision === "APPROVED") return <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 text-[10px] h-5 px-1.5">Approved</Badge>;
      if (decision === "CHANGES_REQUESTED") return <Badge variant="destructive" className="text-[10px] h-5 px-1.5 opacity-80">Changes Requested</Badge>;
      return null;
  };

  const handleSelectPR = (number: number) => {
      if (externalSelectedPRNumber === undefined) {
          setInternalSelectedPRNumber(number);
      }
      if (onSelectPRNumber) onSelectPRNumber(number);
  };

  const handleBack = () => {
      if (externalSelectedPRNumber === undefined) {
          setInternalSelectedPRNumber(null);
      }
      if (onSelectPRNumber) onSelectPRNumber(null);
      if (onBack) onBack();
  };

  if (!repoPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <GitPullRequest className="w-12 h-12 mb-4 opacity-20" />
        <p>No repository selected</p>
      </div>
    );
  }

  // Files processing for details view
  const files: GitFile[] = React.useMemo(() => {
      if (!prDetails?.files) return [];
      return prDetails.files.map(f => ({
          path: f.path,
          status: "modified", 
          code: "",
          additions: f.additions,
          deletions: f.deletions
      }));
  }, [prDetails]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
            {selectedPRNumber ? (
                <Button variant="ghost" size="icon" className="h-7 w-7 -ml-2" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
            ) : (
                <GitPullRequest className="w-4 h-4" />
            )}
            <h3 className="font-semibold text-sm">
                {selectedPRNumber ? `PR #${selectedPRNumber}` : "Open PRs"}
            </h3>
        </div>
        <div className="flex items-center gap-1">
          {!selectedPRNumber && (
            <Button variant="ghost" size="icon" onClick={() => setCreateOpen(true)} className="h-7 w-7" title="Create Pull Request">
                <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => selectedPRNumber ? fetchPRDetails(selectedPRNumber) : fetchPRs()} disabled={loading || detailsLoading} className="h-7 w-7" title="Refresh">
            <RefreshCw className={cn("w-3.5 h-3.5", (loading || detailsLoading) && "animate-spin")} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {selectedPRNumber ? (
            // DETAIL VIEW (Files Only)
            <div className="flex flex-col h-full">
                {detailsLoading && !prDetails ? (
                     <div className="p-4 space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-20 w-full" />
                     </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-border bg-secondary/5">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant={prDetails?.state === "OPEN" ? "default" : "secondary"} className="h-5 px-1.5">{prDetails?.state}</Badge>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs gap-1.5"
                                    onClick={() => prDetails && handleCheckout(prDetails.number)}
                                    disabled={checkoutLoading === prDetails?.number}
                                >
                                    {checkoutLoading === prDetails?.number ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Checkout
                                </Button>
                            </div>
                            <h2 className="text-sm font-semibold leading-tight mb-1 line-clamp-2">{prDetails?.title}</h2>
                            <div className="text-xs text-muted-foreground truncate">{prDetails?.author.login}</div>
                        </div>

                         <div className="flex-1 m-0 overflow-y-auto">
                            <div className="p-0">
                                {files.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">No files changed</div>
                                ) : (
                                    <ChangeGroup title={`Changes (${files.length})`} count={files.length} color="bg-blue-500">
                                       <FileGroupList 
                                            files={files}
                                            selectedFile={selectedFile || null}
                                            onSelect={(file) => onSelectFile && onSelectFile(file)}
                                            dotClass="bg-blue-400"
                                       />
                                    </ChangeGroup>
                                )}
                            </div>
                         </div>
                    </div>
                )}
            </div>
        ) : (
            // LIST VIEW
            <div className="p-3 space-y-3">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                     <p className="font-medium">Error loading PRs</p>
                     <p className="opacity-80 text-xs mt-1">{error}</p>
                     {error.includes("auth login") && (
                         <div className="mt-2 text-xs bg-background/50 p-2 rounded border border-red-500/20">
                             Run <code className="font-mono bg-muted px-1 py-0.5 rounded">gh auth login</code> in your terminal.
                         </div>
                     )}
                  </div>
                </div>
              )}
    
              {loading && !prs.length && (
                 <div className="space-y-3">
                     {[1,2,3].map(i => (
                         <div key={i} className="space-y-2 p-3 border border-border rounded-lg">
                             <Skeleton className="h-4 w-3/4" />
                             <Skeleton className="h-3 w-1/2" />
                         </div>
                     ))}
                 </div>
              )}
    
              {!loading && !error && prs.length === 0 && (
                 <div className="text-center py-8 text-muted-foreground text-sm">
                     No open pull requests found.
                 </div>
              )}
    
              {prs.map((pr) => (
                <div key={pr.number} 
                    onClick={() => handleSelectPR(pr.number)}
                    className="group flex flex-col gap-2 p-3 border border-border rounded-lg bg-card hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm text-foreground line-clamp-2 leading-relaxed">
                      {pr.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0 bg-background">
                      #{pr.number}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{pr.author.login}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                        <span>{new Date(pr.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {getStatusIcon(pr.statusCheckRollup?.state)}
                  </div>
    
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                           {getReviewBadge(pr.reviewDecision)}
                           <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/50">
                               <span className="truncate max-w-[60px]">{pr.headRefName}</span>
                               <ArrowRight className="w-2.5 h-2.5 opacity-50" />
                               <span className="truncate max-w-[60px]">{pr.baseRefName}</span>
                           </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </ScrollArea>
      
      <CreatePRDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        repoPath={repoPath}
        onSuccess={() => {
            fetchPRs();
        }}
      />
    </div>
  );
}
