"use client";

import * as React from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
  Button,
  Input,
  ScrollArea,
  cn
} from "@agelum/shadcn";
import { Check, Plus, Search, GitBranch, Loader2 } from "lucide-react";

interface BranchSwitcherProps {
  currentBranch: string;
  repoPath: string;
  onBranchChanged?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function BranchSwitcher({ 
  currentBranch, 
  repoPath, 
  onBranchChanged,
  className,
  children 
}: BranchSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const [branches, setBranches] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchBranches = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/git?action=branches&path=${encodeURIComponent(repoPath)}`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      } else {
        setError("Failed to fetch branches");
      }
    } catch (e) {
      setError("Error fetching branches");
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  React.useEffect(() => {
    if (open && repoPath) {
      fetchBranches();
    }
  }, [open, repoPath, fetchBranches]);

  const handleCheckout = async (branch: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        body: JSON.stringify({ action: "checkout", repoPath, branch }),
      });
      if (res.ok) {
        setOpen(false);
        onBranchChanged?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!search) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        body: JSON.stringify({ action: "create-branch", repoPath, newBranch: search }),
      });
      if (res.ok) {
        setOpen(false);
        onBranchChanged?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBranches = branches.filter(b => 
    b.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = branches.some(b => b === search);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className={cn("gap-2", className)}>
            <GitBranch className="h-4 w-4" />
            {currentBranch}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 border-border bg-popover/95 backdrop-blur-md shadow-2xl overflow-hidden" align="start">
        <div className="flex items-center border-b border-border/50 px-3 py-2.5 bg-secondary/20">
          <Search className="mr-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search branch..."
            className="flex h-6 w-full rounded-md bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 border-none focus-visible:ring-0 px-0 shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {loading ? (
             <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2.5 text-primary" />
                <span className="text-xs font-medium">Loading branches...</span>
             </div>
        ) : (
            <ScrollArea className="h-[240px] p-1.5">
            {filteredBranches.length === 0 && !search && (
                <div className="py-10 text-center text-xs text-muted-foreground italic">No branches found.</div>
            )}
            
            <div className="space-y-0.5">
                {filteredBranches.map((branch) => (
                    <div
                    key={branch}
                    onClick={() => handleCheckout(branch)}
                    className={cn(
                        "group relative flex select-none items-center rounded-md px-2.5 py-2 text-xs outline-none transition-all duration-200 cursor-pointer",
                        branch === currentBranch 
                            ? "bg-primary/10 text-primary font-semibold" 
                            : "text-foreground/70 hover:bg-secondary/80 hover:text-foreground"
                    )}
                    >
                    <GitBranch className={cn("mr-2.5 h-3.5 w-3.5 transition-colors", branch === currentBranch ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="flex-1 truncate">{branch}</span>
                    {branch === currentBranch && (
                        <Check className="ml-auto h-3.5 w-3.5 text-primary animate-in zoom-in-50 duration-300" />
                    )}
                    </div>
                ))}
            </div>

            {search && !exactMatch && (
                 <div
                    onClick={handleCreateBranch}
                    className="relative flex cursor-pointer select-none items-center rounded-md px-2.5 py-2 text-xs outline-none bg-primary/5 hover:bg-primary/10 text-primary font-semibold border-t border-border/50 mt-1.5 pt-2 whitespace-nowrap overflow-hidden transition-all"
                >
                    <Plus className="mr-2.5 h-3.5 w-3.5" />
                    <span>Create branch: <span className="underline decoration-primary/30 underline-offset-2 ml-1">&quot;{search}&quot;</span></span>
                </div>
            )}
            </ScrollArea>
        )}
        {(actionLoading) && (
             <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 backdrop-blur-[1px]">
                 <Loader2 className="h-5 w-5 animate-spin text-primary" />
             </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
