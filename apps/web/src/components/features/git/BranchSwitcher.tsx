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

  React.useEffect(() => {
    if (open && repoPath) {
      fetchBranches();
    }
  }, [open, repoPath]);

  const fetchBranches = async () => {
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
  };

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
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2 bg-muted/40 backdrop-blur-sm">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search branch..."
            className="flex h-7 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus-visible:ring-0 px-0 shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {loading ? (
             <div className="flex items-center justify-center p-4 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Loading branches...</span>
             </div>
        ) : (
            <ScrollArea className="h-[200px] p-1">
            {filteredBranches.length === 0 && !search && (
                <div className="py-6 text-center text-sm text-muted-foreground">No branches found.</div>
            )}
            
            {filteredBranches.map((branch) => (
                <div
                key={branch}
                onClick={() => handleCheckout(branch)}
                className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                    branch === currentBranch && "bg-accent/50 text-accent-foreground"
                )}
                >
                <GitBranch className="mr-2 h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{branch}</span>
                {branch === currentBranch && (
                    <Check className="ml-auto h-4 w-4 opacity-100 text-primary" />
                )}
                </div>
            ))}

            {search && !exactMatch && (
                 <div
                    onClick={handleCreateBranch}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-foreground font-medium border-t mt-1 pt-2"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create branch: <span className="font-bold ml-1 truncate">"{search}"</span>
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
