"use client";

import * as React from "react";
import { Dialog, DialogContent, Input, ScrollArea, cn, Switch, Label } from "@agelum/shadcn";
import { Search, Hash, FileText } from "lucide-react";
import { useHomeStore } from "@/store/useHomeStore";

interface TextResult {
  file: string;
  line: number;
  content: string;
}

interface TextSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TextSearchDialog({
  open,
  onOpenChange,
}: TextSearchDialogProps) {
  const { selectedRepo, setViewMode, handleFileSelect } = useHomeStore();
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<TextResult[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isSearching, setIsSearching] = React.useState(false);
  const [includeCommon, setIncludeCommon] = React.useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search for text
  React.useEffect(() => {
    if (!search.trim() || !selectedRepo || search.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/files/text-search?repo=${encodeURIComponent(selectedRepo)}&query=${encodeURIComponent(search)}&includeCommon=${includeCommon}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Failed to search text:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce for text search as it's more expensive

    return () => clearTimeout(searchTimeout);
  }, [search, selectedRepo, includeCommon]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, results, selectedIndex]);

  const handleSelectResult = (result: TextResult) => {
    // Switch to review tab and open the file at specific line
    setViewMode("review");
    handleFileSelect({
      name: result.file.split("/").pop() || "",
      path: result.file,
      type: "file",
      line: result.line,
    });
    onOpenChange(false);
  };

  return (
    <>
      {/* Backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={() => onOpenChange(false)}
        />
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[800px] p-0 border-white/[0.08] bg-zinc-950 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] rounded-[24px] overflow-hidden backdrop-blur-3xl ring-1 ring-white/10 z-50">
          {/* Header */}
          <div className="p-6 pb-4 flex flex-col gap-4 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Search className="h-4 w-4 text-zinc-400" />
                  Text Search
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Search for text content in {selectedRepo || "your project"}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-common-text"
                  checked={includeCommon}
                  onCheckedChange={setIncludeCommon}
                  className="scale-75 data-[state=checked]:bg-white"
                />
                <Label 
                  htmlFor="include-common-text" 
                  className="text-[11px] font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors"
                >
                  Include ignored
                </Label>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <Input
                placeholder="Type to search text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 bg-white/[0.03] border-white/[0.06] focus-visible:ring-0 focus-visible:border-white/20 transition-all rounded-2xl text-white placeholder:text-zinc-600 shadow-inner"
                autoFocus
              />
            </div>
          </div>

          {/* Results Area */}
          <ScrollArea className="h-[500px] px-6">
            <div className="pb-6 space-y-2">
              {!search.trim() ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-lg">
                    <Search className="h-6 w-6 text-zinc-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-zinc-400">
                      Start typing to search code
                    </p>
                    <p className="text-xs text-zinc-600">
                      Use arrow keys to navigate and Enter to open
                    </p>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-lg">
                    <Search className="h-6 w-6 text-zinc-400 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-zinc-400">
                      Searching...
                    </p>
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-lg">
                    <Search className="h-6 w-6 text-zinc-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-zinc-400">
                      No matches found
                    </p>
                    <p className="text-xs text-zinc-600">
                      Try a different search term
                    </p>
                  </div>
                </div>
              ) : (
                results.map((result, index) => {
                  const isSelected = index === selectedIndex;
                  // Highlight search term in content
                  const highlightedContent = result.content.replace(
                    new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"),
                    "<mark class='bg-yellow-500/30 text-white rounded-sm px-0.5'>$1</mark>"
                  );

                  return (
                    <div
                      key={`${result.file}-${result.line}-${index}`}
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        "relative flex flex-col gap-1 p-3 cursor-pointer transition-all duration-300 border rounded-[16px]",
                        "bg-white/[0.02] hover:bg-white/[0.05]",
                        isSelected &&
                          "bg-white/[0.06] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/10",
                        !isSelected &&
                          "border-white/[0.04] hover:border-white/10",
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <FileText className="h-3 w-3" />
                          {result.file}
                        </span>
                        <span className="flex items-center gap-1 bg-white/[0.05] px-1.5 py-0.5 rounded text-zinc-400">
                          <Hash className="h-2.5 w-2.5" />
                          {result.line}
                        </span>
                      </div>
                      
                      <div 
                        className="text-[13px] font-mono text-zinc-300 truncate pl-4 border-l-2 border-white/10 ml-0.5"
                        dangerouslySetInnerHTML={{ __html: highlightedContent }}
                      />

                      {/* Glow effect for selected */}
                      {isSelected && (
                        <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-white/5 blur-2xl rounded-full" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white/[0.05] border border-white/10 rounded text-zinc-400">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white/[0.05] border border-white/10 rounded text-zinc-400">
                  ↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-white/[0.05] border border-white/10 rounded text-zinc-400">
                  Enter
                </kbd>
                Open
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-white/[0.05] border border-white/10 rounded text-zinc-400">
                  Esc
                </kbd>
                Close
              </span>
            </div>
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              {results.length} {results.length === 1 ? "Result" : "Results"}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
