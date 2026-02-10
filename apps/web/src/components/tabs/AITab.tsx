"use client";

import * as React from "react";
import { useHomeStore } from "@/store/useHomeStore";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { AIRightSidebar } from "@/components/layout/AIRightSidebar";

export function AITab() {
  const store = useHomeStore();
  const {
    selectedRepo,
    setSelectedRepo,
    repositories,
    isRepositoriesLoading,
    handleStartApp,
    handleStopApp,
    agentTools,
    handleRunTest,
  } = store;

  const { 
    viewMode,
    selectedFile,
    workDocIsDraft,
    testViewMode,
    testOutput,
    isTestRunning
  } = store.getProjectState();

  return (
    <div className="flex w-full h-full bg-background relative overflow-hidden">
      {/* Left Sidebar - Project List (similar to wide mode concept) */}
      <div className="w-[300px] border-r border-border flex flex-col bg-secondary/30">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">Projects</h2>
          <ProjectSelector 
            repositories={repositories} 
            selectedRepo={selectedRepo} 
            onSelect={setSelectedRepo}
            currentViewMode={viewMode}
            isLoading={isRepositoriesLoading}
            className="w-full"
          />
        </div>
        <div className="flex-1 overflow-auto p-2">
           {/* Future: History of previous prompts/sessions per project could go here */}
           <div className="text-xs text-muted-foreground text-center p-4 italic">
             Select a project to view AI tools and history.
           </div>
        </div>
      </div>

      {/* Right Content - AI Tools */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {selectedRepo ? (
           <AIRightSidebar
             selectedRepo={selectedRepo}
             basePath={store.basePath}
             projectPath={repositories.find(r => r.name === selectedRepo)?.path}
             agentTools={agentTools}
             viewMode="ai"
             file={selectedFile}
             workDocIsDraft={workDocIsDraft}
             testViewMode={testViewMode}
             testOutput={testOutput}
             isTestRunning={isTestRunning}
             onRunTest={handleRunTest}
             className="w-full h-full border-0"
             contextKey={`ai-tab-${selectedRepo}`}
           />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a project to start using AI tools
          </div>
        )}
      </div>
    </div>
  );
}
