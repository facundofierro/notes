
import * as React from "react";
import { Folder, FileJson, ChevronDown, ChevronRight, Search, Plus, Trash2, Play, Loader2 } from "lucide-react";
import { cn, ScrollArea, Button, Input } from "@agelum/shadcn";
import { TestScenario } from "./types";

interface TestsSidebarProps {
  tests: TestScenario[];
  groups?: string[];
  selectedTestId: string | null;
  onSelectTest: (test: TestScenario) => void;
  onCreateTest: () => void;
  onCreateGroup?: () => void;
  onDeleteTest?: (id: string) => void;
  onRunTest?: (id: string) => void;
  isRunning?: boolean;
  runningTestId?: string | null;
  className?: string;
}

export function TestsSidebar({
  tests,
  groups: folderList,
  selectedTestId,
  onSelectTest,
  onCreateTest,
  onCreateGroup,
  onDeleteTest,
  onRunTest,
  isRunning,
  runningTestId,
  className,
}: TestsSidebarProps) {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const [search, setSearch] = React.useState("");

  // Group tests
  const grouped = React.useMemo(() => {
    const groups: Record<string, TestScenario[]> = {};
    
    // Initialize with provided folder list
    if (folderList) {
      folderList.forEach(g => {
        groups[g] = [];
      });
    }

    tests.forEach(test => {
      const g = test.group || "ungrouped";
      if (!groups[g]) groups[g] = [];
      groups[g].push(test);
    });
    return groups;
  }, [tests, folderList]);

  const filteredGroups = React.useMemo(() => {
    if (!search) return grouped;
    const result: Record<string, TestScenario[]> = {};
    Object.keys(grouped).forEach(g => {
        const matches = grouped[g].filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
        if (matches.length > 0) result[g] = matches;
    });
    return result;
  }, [grouped, search]);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Auto-expand if searching or if selected test is inside
  React.useEffect(() => {
    if (search) {
        const allOpen: Record<string, boolean> = {};
        Object.keys(filteredGroups).forEach(g => allOpen[g] = true);
        setOpenGroups(allOpen);
    }
  }, [search, filteredGroups]);

  // Auto-expand group containing selected test
  React.useEffect(() => {
    if (selectedTestId) {
      const test = tests.find(t => t.id === selectedTestId);
      if (test) {
        const g = test.group || "ungrouped";
        setOpenGroups(prev => ({ ...prev, [g]: true }));
      }
    }
  }, [selectedTestId, tests]);

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950/50", className)}>
      <div className="p-4 border-b border-white/[0.04] bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
         <div className="flex items-center justify-between mb-3">
           <h2 className="text-sm font-bold text-white flex items-center gap-2">
               <Folder className="w-4 h-4 text-emerald-500" />
               Test Explorer
           </h2>
           <Button
             variant="ghost"
             size="icon"
             onClick={onCreateTest}
             className="w-6 h-6 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
             title="New Test"
           >
             <Plus className="w-3.5 h-3.5" />
           </Button>
         </div>
         <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-white transition-colors" />
             <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tests..."
                className="pl-9 h-8 bg-white/[0.03] border-white/[0.04] text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:bg-white/[0.08] transition-all rounded-lg"
             />
         </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
         {Object.keys(filteredGroups).length === 0 ? (
             <div className="flex flex-col items-center py-10 text-zinc-600 text-xs">
                 <FileJson className="w-5 h-5 mb-2 opacity-40" />
                 {search ? "No matching tests" : "No tests yet"}
             </div>
         ) : (
             <div className="flex flex-col gap-1">
                 {Object.entries(filteredGroups).map(([group, groupTests]) => (
                     <div key={group}>
                         <button
                            onClick={() => toggleGroup(group)}
                            className="flex items-center w-full px-2 py-1.5 hover:bg-white/[0.03] rounded-lg transition-colors text-zinc-400 hover:text-white group/folder"
                         >
                             {openGroups[group] ? (
                                 <ChevronDown className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                             ) : (
                                 <ChevronRight className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                             )}
                             <Folder className={cn(
                                 "w-4 h-4 mr-2 transition-colors",
                                 openGroups[group] ? "text-amber-400" : "text-zinc-600 group-hover/folder:text-zinc-400"
                             )} />
                             <span className="text-xs font-semibold uppercase tracking-wider">{group}</span>
                             <span className="ml-auto text-[10px] text-zinc-600 bg-white/[0.02] px-1.5 rounded">{groupTests.length}</span>
                         </button>

                         {openGroups[group] && (
                             <div className="ml-2 pl-3 border-l border-white/[0.04] mt-1 flex flex-col gap-0.5 animate-in slide-in-from-top-2 duration-200">
                                 {groupTests.map(test => {
                                     const isSelected = selectedTestId === test.id;
                                     const isTestRunning = runningTestId === test.id;
                                     return (
                                         <div
                                            key={test.id}
                                            className={cn(
                                                "flex items-center w-full px-2 py-1.5 rounded-lg text-left transition-all group/item relative overflow-hidden",
                                                isSelected
                                                    ? "bg-emerald-500/10 text-emerald-400 font-medium"
                                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                                            )}
                                         >
                                             <button
                                               onClick={() => onSelectTest(test)}
                                               className="flex items-center flex-1 min-w-0"
                                             >
                                               <FileJson className={cn(
                                                   "w-3.5 h-3.5 mr-2 flex-shrink-0",
                                                   isSelected ? "text-emerald-500" : "text-zinc-600 group-hover/item:text-zinc-400"
                                               )} />
                                               <span className="text-xs truncate flex-1">{test.name}</span>
                                             </button>

                                             {/* Hover actions */}
                                             <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                                               {onRunTest && (
                                                 <button
                                                   onClick={(e) => { e.stopPropagation(); onRunTest(test.id); }}
                                                   disabled={isRunning}
                                                   className="p-1 rounded hover:bg-white/[0.06] text-zinc-500 hover:text-emerald-400 transition-colors"
                                                   title="Run test"
                                                 >
                                                   {isTestRunning ? (
                                                     <Loader2 className="w-3 h-3 animate-spin" />
                                                   ) : (
                                                     <Play className="w-3 h-3" />
                                                   )}
                                                 </button>
                                               )}
                                               {onDeleteTest && (
                                                 <button
                                                   onClick={(e) => { e.stopPropagation(); onDeleteTest(test.id); }}
                                                   className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                                                   title="Delete test"
                                                 >
                                                   <Trash2 className="w-3 h-3" />
                                                 </button>
                                               )}
                                             </div>

                                             {isSelected && (
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-r" />
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                         )}
                     </div>
                 ))}
             </div>
         )}
      </ScrollArea>

      <div className="p-3 border-t border-white/[0.04] bg-zinc-950/30 flex flex-col gap-2">
          <Button
            onClick={onCreateTest}
            size="sm"
            className="w-full h-8 text-xs bg-emerald-600/20 border border-emerald-500/20 hover:bg-emerald-600/30 hover:border-emerald-500/30 text-emerald-400 rounded-lg"
          >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Test
          </Button>
          {onCreateGroup && (
            <Button
              variant="ghost"
              onClick={onCreateGroup}
              size="sm"
              className="w-full h-7 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
            >
                + New Group
            </Button>
          )}
      </div>
    </div>
  );
}
