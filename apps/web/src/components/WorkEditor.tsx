"use client";

import * as React from "react";
import FileViewer from "@/components/FileViewer";
import { AIRightSidebar } from "@/components/AIRightSidebar";

interface FileNode {
  path: string;
  content: string;
}

interface WorkEditorProps {
  file: FileNode;
  onFileChange: (file: FileNode | null) => void;
  onBack: () => void;
  onRename?: (newTitle: string) => Promise<{ path: string; content: string } | void>;
  onRefresh?: () => void;
  viewMode: string;
  selectedRepo: string | null;
  basePath: string;
  projectPath?: string | null;
  agentTools: Array<{ name: string; displayName: string; available: boolean }>;
  workEditorEditing: boolean;
  onWorkEditorEditingChange: (editing: boolean) => void;
  workDocIsDraft: boolean;
  testViewMode: "steps" | "code" | "results";
  onTestViewModeChange: (mode: "steps" | "code" | "results") => void;
  testOutput: string;
  isTestRunning: boolean;
  onRunTest?: (path: string) => void;
}

export function WorkEditor({
  file,
  onFileChange,
  onBack,
  onRename,
  onRefresh,
  viewMode,
  selectedRepo,
  basePath,
  projectPath,
  agentTools,
  workEditorEditing,
  onWorkEditorEditingChange,
  workDocIsDraft,
  testViewMode,
  onTestViewModeChange,
  testOutput,
  isTestRunning,
  onRunTest,
}: WorkEditorProps) {

  const handleSaveFile = async (opts: { path: string; content: string }) => {
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) throw new Error("Failed to save file");
    onFileChange({ path: opts.path, content: opts.content });
  };

  return (
    <div className="flex w-full h-full">
      <div className="flex overflow-hidden flex-1 border-r border-border">
        <FileViewer
          file={file}
          onSave={handleSaveFile}
          onFileSaved={onRefresh}
          editing={workEditorEditing}
          onEditingChange={onWorkEditorEditingChange}
          onBack={onBack}
          onRename={onRename}
          isTestFile={viewMode === "tests"}
          testViewMode={testViewMode}
          onTestViewModeChange={onTestViewModeChange}
          testOutput={testOutput}
          isTestRunning={isTestRunning}
        />
      </div>
      <AIRightSidebar
        selectedRepo={selectedRepo}
        basePath={basePath}
        projectPath={projectPath}
        agentTools={agentTools}
        viewMode={viewMode}
        file={file}
        workDocIsDraft={workDocIsDraft}
        testViewMode={testViewMode}
        testOutput={testOutput}
        isTestRunning={isTestRunning}
        onRunTest={onRunTest}
      />
    </div>
  );
}