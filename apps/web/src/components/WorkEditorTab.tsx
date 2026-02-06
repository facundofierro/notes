"use client";

import * as React from "react";
import { WorkEditor } from "./WorkEditor";
import { useHomeStore } from "@/store/useHomeStore";

interface WorkEditorTabProps {
  onBack: () => void;
  onRename?: (
    newTitle: string,
  ) => Promise<{ path: string; content: string } | void>;
  onRefresh?: () => void;
}

export function WorkEditorTab({
  onBack,
  onRename,
  onRefresh,
}: WorkEditorTabProps) {
  const store = useHomeStore();
  const {
    selectedFile,
    viewMode,
    workEditorEditing,
    workDocIsDraft,
    testViewMode,
    testOutput,
    isTestRunning,
  } = store.getProjectState();

  const {
    setSelectedFile,
    handleRunTest,
    selectedRepo,
    basePath,
    agentTools
  } = store;

  if (!selectedFile) return null;

  return (
    <WorkEditor
      file={selectedFile}
      onFileChange={setSelectedFile}
      onBack={onBack}
      onRename={onRename}
      onRefresh={onRefresh}
      viewMode={viewMode}
      selectedRepo={selectedRepo}
      basePath={basePath}
      agentTools={agentTools}
      workEditorEditing={workEditorEditing}
      onWorkEditorEditingChange={(editing) => store.setProjectState(() => ({ workEditorEditing: editing }))}
      workDocIsDraft={workDocIsDraft}
      testViewMode={testViewMode}
      onTestViewModeChange={(mode) => store.setProjectState(() => ({ testViewMode: mode }))}
      testOutput={testOutput}
      isTestRunning={isTestRunning}
      onRunTest={handleRunTest}
    />
  );
}