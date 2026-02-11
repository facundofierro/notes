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
  tabId,
}: WorkEditorTabProps & { tabId?: string }) {
  const store = useHomeStore();
  const projectState = store.getProjectState();

  const { viewMode, testViewMode, testOutput, isTestRunning, tabs } =
    projectState;

  // Resolve state based on tabId or fallback to global (legacy)
  const tabState = tabId ? tabs[tabId] : null;

  const selectedFile = tabState
    ? tabState.selectedFile
    : projectState.selectedFile;
  const workEditorEditing = tabState
    ? tabState.workEditorEditing
    : projectState.workEditorEditing;
  const workDocIsDraft = tabState
    ? tabState.workDocIsDraft
    : projectState.workDocIsDraft;

  const {
    setSelectedFile,
    setTabFile,
    setTabEditing,
    handleRunTest,
    saveFile,
    selectedRepo,
    basePath,
    repositories,
    settings,
    agentTools,
  } = store;

  const handleFileChange = React.useCallback(
    (file: { path: string; content: string } | null) => {
      if (tabId) {
        setTabFile(tabId, file);
      } else {
        setSelectedFile(file);
      }
    },
    [tabId, setTabFile, setSelectedFile],
  );

  const handleEditingChange = React.useCallback(
    (editing: boolean) => {
      if (tabId) {
        setTabEditing(tabId, editing);
      } else {
        store.setProjectState(() => ({ workEditorEditing: editing }));
      }
    },
    [tabId, setTabEditing, store],
  );

  const projectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)?.path ||
      settings.projects?.find((p) => p.name === selectedRepo)?.path ||
      null
    );
  }, [repositories, selectedRepo, settings.projects]);

  if (!selectedFile) return null;

  return (
    <WorkEditor
      file={selectedFile}
      onFileChange={handleFileChange}
      onBack={onBack}
      onRename={onRename}
      onRefresh={onRefresh}
      viewMode={viewMode}
      selectedRepo={selectedRepo}
      basePath={basePath}
      projectPath={projectPath}
      agentTools={agentTools}
      workEditorEditing={workEditorEditing}
      onWorkEditorEditingChange={handleEditingChange}
      workDocIsDraft={workDocIsDraft}
      testViewMode={testViewMode}
      onTestViewModeChange={(mode) =>
        store.setProjectState(() => ({ testViewMode: mode }))
      }
      testOutput={testOutput}
      isTestRunning={isTestRunning}
      onRunTest={handleRunTest}
      contextKey={selectedFile ? `${viewMode}:${selectedFile.path}` : ""}
      onSave={saveFile}
    />
  );
}
