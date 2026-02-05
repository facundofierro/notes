"use client";

import * as React from "react";
import { Circle, FolderTree, ChevronDown } from "lucide-react";

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

interface ProjectSelectorProps {
  repositories: Repository[];
  selectedRepo: string | null;
  onSelect: (repoName: string) => void;
  className?: string;
}

export function ProjectSelector({
  repositories,
  selectedRepo,
  onSelect,
  className,
}: ProjectSelectorProps) {
  const [projectStatuses, setProjectStatuses] = React.useState<Record<string, ProjectStatus>>({});
  const [showTooltip, setShowTooltip] = React.useState(false);

  // Load status for selected project
  React.useEffect(() => {
    if (!selectedRepo) return;
    
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/app-status?repo=${encodeURIComponent(selectedRepo)}`);
        if (res.ok) {
          const data = await res.json();
          setProjectStatuses(prev => ({
            ...prev,
            [selectedRepo]: {
              isRunning: data.isRunning || false,
              isManaged: data.isManaged || false,
              pid: data.pid || null,
            }
          }));
        }
      } catch (error) {
        console.error(`Failed to fetch status for ${selectedRepo}:`, error);
      }
    };
    
    fetchStatus();
    // Poll every 5 seconds to keep status up to date
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedRepo]);

  const selectedRepository = repositories.find((r) => r.name === selectedRepo);
  const selectedStatus = selectedRepo ? projectStatuses[selectedRepo] : null;
  const isFromFolder = selectedRepository?.folderConfigId;

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      {selectedRepo && selectedStatus && (
        <div
          className="flex items-center" 
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Circle
            className={`h-2 w-2 ${
              selectedStatus.isRunning
                ? "fill-green-500 text-green-500 animate-pulse"
                : "fill-muted-foreground/30 text-muted-foreground/30"
            }`}
          />
          {showTooltip && (
            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-secondary border border-border rounded text-xs whitespace-nowrap z-50">
              Status: {selectedStatus.isRunning ? "Running" : "Stopped"}
            </div>
          )}
        </div>
      )}
      
      {/* Folder indicator */}
      {isFromFolder && (
        <div title="From folder container">
          <FolderTree className="h-3 w-3 text-amber-500 shrink-0" />
        </div>
      )}
      
      {/* Select */}
      <div className="flex relative items-center flex-1">
        <select
          value={selectedRepo || ""}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-transparent text-foreground text-sm border-none focus:ring-0 p-0 pr-6 appearance-none cursor-pointer hover:text-white font-medium w-full"
        >
          <option value="" disabled className="bg-secondary">
            {repositories.length === 0
              ? "No projects found"
              : "Select project..."}
          </option>
          {repositories.map((repo) => (
            <option key={repo.name} value={repo.name} className="bg-secondary">
              {repo.name}{repo.folderConfigId ? " 📁" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-0 w-4 h-4 pointer-events-none text-muted-foreground" />
      </div>
    </div>
  );
}
