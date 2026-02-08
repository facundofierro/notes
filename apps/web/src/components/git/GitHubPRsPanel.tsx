import * as React from "react";
import { GitPullRequest, RefreshCw, ExternalLink, ArrowRight, Check, AlertCircle } from "lucide-react";
import { Button, ScrollArea, Skeleton, Badge, cn } from "@agelum/shadcn";

interface PR {
  number: number;
  title: string;
  author: { login: string };
  updatedAt: string;
  url: string;
  state: string;
  headRefName: string;
  baseRefName: string;
}

interface GitHubPRsPanelProps {
  repoPath: string;
}

export function GitHubPRsPanel({ repoPath }: GitHubPRsPanelProps) {
  const [prs, setPrs] = React.useState<PR[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState<number | null>(null);

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

  React.useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const handleCheckout = async (pr: PR) => {
    setCheckoutLoading(pr.number);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "checkout",
          repoPath,
          prNumber: pr.number,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to checkout PR");
      }
      // Notify success? Refresh?
      // Ideally we should tell the parent to refresh the git status/branch view
    } catch (err: any) {
      console.error(err);
      // Show error handling
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (!repoPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <GitPullRequest className="w-12 h-12 mb-4 opacity-20" />
        <p>No repository selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <GitPullRequest className="w-4 h-4" />
          Open PRs
        </h3>
        <Button variant="ghost" size="icon" onClick={fetchPRs} disabled={loading} className="h-7 w-7">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
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
            <div key={pr.number} className="group flex flex-col gap-2 p-3 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <a href={pr.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline hover:text-primary line-clamp-2">
                  {pr.title}
                </a>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                  #{pr.number}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{pr.author.login}</span>
                <span>•</span>
                <span>{new Date(pr.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      <span className="truncate max-w-[80px]" title={pr.headRefName}>{pr.headRefName}</span>
                      <ArrowRight className="w-3 h-3 opacity-50" />
                      <span className="truncate max-w-[80px]" title={pr.baseRefName}>{pr.baseRefName}</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-7 text-xs gap-1.5"
                    onClick={() => handleCheckout(pr)}
                    disabled={checkoutLoading === pr.number}
                  >
                    {checkoutLoading === pr.number ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                        <Check className="w-3 h-3" />
                    )}
                    Checkout
                  </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
