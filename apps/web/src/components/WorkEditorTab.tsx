"use client";

import * as React from "react";
import { WorkEditor } from "./WorkEditor";
import { HomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";

interface WorkEditorTabProps {
  state: HomeState;
  callbacks: ReturnType<typeof useHomeCallbacks>;
  onBack: () => void;
  onRename?: (
    newTitle: string,
  ) => Promise<{ path: string; content: string } | void>;
  onRefresh?: () => void;
}

export function WorkEditorTab({
  state,
  callbacks,
  onBack,
  onRename,
  onRefresh,
}: WorkEditorTabProps) {
  const {
    selectedFile,
    setSelectedFile,
    viewMode,
    selectedRepo,
    basePath,
    agentTools,
    workEditorEditing,
    setWorkEditorEditing,
    workDocIsDraft,
    testViewMode,
    setTestViewMode,
    testOutput,
    isTestRunning,
  } = state;

  const { handleRunTest } = callbacks;

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
      onWorkEditorEditingChange={setWorkEditorEditing}
      workDocIsDraft={workDocIsDraft}
      testViewMode={testViewMode}
      onTestViewModeChange={setTestViewMode}
      testOutput={testOutput}
      isTestRunning={isTestRunning}
      onRunTest={handleRunTest}
    />
  );
}
