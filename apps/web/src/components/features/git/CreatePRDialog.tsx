import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agelum/shadcn";
import { Loader2, GitPullRequest } from "lucide-react";

interface CreatePRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoPath: string;
  onSuccess: () => void;
}

export function CreatePRDialog({
  open,
  onOpenChange,
  repoPath,
  onSuccess,
}: CreatePRDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [branches, setBranches] = React.useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = React.useState("");
  
  // Form State
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sourceBranch, setSourceBranch] = React.useState("");
  const [targetBranch, setTargetBranch] = React.useState("main");
  const [isDraft, setIsDraft] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && repoPath) {
      fetchBranches();
    }
  }, [open, repoPath]);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch available branches
      const branchesRes = await fetch(`/api/github?action=branches&path=${encodeURIComponent(repoPath)}`);
      const branchesData = await branchesRes.json();
      
      // Fetch current branch
      const currentRes = await fetch(`/api/github?action=current-branch&path=${encodeURIComponent(repoPath)}`);
      const currentData = await currentRes.json();

      if (branchesData.branches) {
        setBranches(branchesData.branches);
      }
      if (currentData.branch) {
        setCurrentBranch(currentData.branch);
        setSourceBranch(currentData.branch);
        
        // Auto-generate title from branch name if empty
        if (!title) {
            // humanize branch name: feature/foo-bar -> Foo Bar
            const humanized = currentData.branch
                .split('/')
                .pop()
                .replace(/-/g, ' ')
                .replace(/^\w/, (c: string) => c.toUpperCase());
            setTitle(humanized);
        }
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
      setError("Failed to load branches. Ensure git is initialized.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !sourceBranch || !targetBranch) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          repoPath,
          title,
          body,
          head: sourceBranch,
          base: targetBranch,
          isDraft,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create PR");
      }

      onSuccess();
      onOpenChange(false);
      // Reset form (optional, or kept for next time if reopening?)
      setTitle("");
      setBody("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Create Pull Request
          </DialogTitle>
          <DialogDescription>
            Create a new pull request from your current branch.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
           <div className="flex justify-center py-8">
             <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Source Branch (Head)</Label>
                 <Select value={sourceBranch} onValueChange={setSourceBranch}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Target Branch (Base)</Label>
                 <Select value={targetBranch} onValueChange={setTargetBranch}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
               </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Brief summary of changes"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea 
                id="body" 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                placeholder="Describe your changes..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="draft" 
                    checked={isDraft} 
                    onChange={(e) => setIsDraft(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="draft" className="font-normal cursor-pointer">
                    Create as Draft
                </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Pull Request
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
