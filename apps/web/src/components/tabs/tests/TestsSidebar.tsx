
import * as React from "react";
import { Folder, FileJson, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn, ScrollArea, Button, Input } from "@agelum/shadcn";
import { TestScenario } from "./types";

interface TestsSidebarProps {
  tests: TestScenario[];
  selectedTestId: string | null;
  onSelectTest: (test: TestScenario) => void;
  className?: string;
}

export function TestsSidebar({ tests, selectedTestId, onSelectTest, className }: TestsSidebarProps) {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const [search, setSearch] = React.useState("");

  // Group tests
  const grouped = React.useMemo(() => {
    const groups: Record<string, TestScenario[]> = {};
    tests.forEach(test => {
      const g = test.group || "ungrouped";
      if (!groups[g]) groups[g] = [];
      groups[g].push(test);
    });
    return groups;
  }, [tests]);

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

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950/50 border-r border-white/5", className)}>
      <div className="p-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
         <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
             <Folder className="w-4 h-4 text-emerald-500" />
             Test Explorer
         </h2>
         <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-white transition-colors" />
             <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tests..." 
                className="pl-9 h-9 bg-white/[0.03] border-white/5 text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:bg-white/[0.08] transition-all rounded-lg"
             />
         </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
         {Object.keys(filteredGroups).length === 0 ? (
             <div className="text-center py-10 text-zinc-600 text-xs">
                 No tests found
             </div>
         ) : (
             <div className="flex flex-col gap-1">
                 {Object.entries(filteredGroups).map(([group, groupTests]) => (
                     <div key={group}>
                         <button 
                            onClick={() => toggleGroup(group)}
                            className="flex items-center w-full px-2 py-1.5 hover:bg-white/[0.03] rounded-md transition-colors text-zinc-400 hover:text-white group/folder"
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
                             <div className="ml-2 pl-3 border-l border-white/5 mt-1 flex flex-col gap-0.5 animate-in slide-in-from-top-2 duration-200">
                                 {groupTests.map(test => {
                                     const isSelected = selectedTestId === test.id;
                                     return (
                                         <button
                                            key={test.id}
                                            onClick={() => onSelectTest(test)}
                                            className={cn(
                                                "flex items-center w-full px-2 py-1.5 rounded-md text-left transition-all group/item relative overflow-hidden",
                                                isSelected 
                                                    ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                                            )}
                                         >
                                             <FileJson className={cn(
                                                 "w-3.5 h-3.5 mr-2 flex-shrink-0",
                                                 isSelected ? "text-emerald-500" : "text-zinc-600 group-hover/item:text-zinc-400"
                                             )} />
                                             <span className="text-xs truncate flex-1">{test.name}</span>
                                             {isSelected && (
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500" />
                                             )}
                                         </button>
                                     );
                                 })}
                             </div>
                         )}
                     </div>
                 ))}
             </div>
         )}
      </ScrollArea>
      
      <div className="p-3 border-t border-white/5 bg-zinc-950/50">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs bg-white/[0.03] border-white/10 hover:bg-white/10 hover:text-white text-zinc-400">
              + New Group
          </Button>
      </div>
    </div>
  );
}
