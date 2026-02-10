"use client";

import * as React from "react";
import { cn } from "@agelum/shadcn";
import { AIRightSidebar } from "@/components/layout/AIRightSidebar";
import { useHomeStore } from "@/store/useHomeStore";
import { TestsSidebar } from "./tests/TestsSidebar";
import { TestsDashboard } from "./tests/TestsDashboard";
import { TestDetailView } from "./tests/TestDetailView";
import { ExecutionView } from "./tests/ExecutionView";
import { TestRecordView } from "./tests/TestRecordView";
import { useTestsState } from "./tests/useTestsState";

export function TestsTab() {
  const store = useHomeStore();
  const {
    selectedRepo,
    basePath,
    repositories,
    settings,
    agentTools,
    handleRunTest,
  } = store;

  const projectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)?.path ||
      settings.projects?.find((p) => p.name === selectedRepo)?.path ||
      null
    );
  }, [repositories, selectedRepo, settings.projects]);

  const {
    viewMode,
    workDocIsDraft,
    testViewMode,
    testOutput,
    isTestRunning: storeIsTestRunning
  } = store.getProjectState();

  const state = useTestsState();

  // Fetch executions on mount
  React.useEffect(() => {
    state.fetchExecutions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteTest = React.useCallback(async (id: string) => {
    if (!confirm("Delete this test?")) return;
    await state.deleteTest(id);
  }, [state]);

  const renderCenterView = () => {
    const { centerView } = state;
    switch (centerView.kind) {
      case "dashboard":
        return (
          <TestsDashboard
            tests={state.tests}
            executions={state.executions}
            executionsLoading={state.executionsLoading}
            loading={state.loading}
            onSelectTest={state.selectTest}
            onCreateTest={() => state.createTest()}
            onRunAll={() => {
              // Run first test as a start; could be extended to run all sequentially
              if (state.tests.length > 0) {
                state.runTest(state.tests[0].id);
              }
            }}
            onSelectExecution={state.openExecution}
            isRunning={state.isRunning}
          />
        );
      case "detail":
        return (
          <TestDetailView
            testId={centerView.testId}
            executions={state.executions}
            executionsLoading={state.executionsLoading}
            isRunning={state.isRunning}
            onBack={state.goToDashboard}
            onRun={state.runTest}
            onRecord={state.startRecording}
            onSelectExecution={state.openExecution}
            fetchExecutions={state.fetchExecutions}
          />
        );
      case "record":
        return (
          <TestRecordView
            testId={centerView.testId}
            onStop={() => state.stopRecording(centerView.testId)}
            projectPath={projectPath}
          />
        );
      case "execution":
        return (
          <ExecutionView
            executionId={centerView.executionId}
            testId={centerView.testId}
            logs={state.executionLogs}
            screenshots={state.executionScreenshots}
            isRunning={state.isRunning}
            onClose={() => {
              // Go back to detail if we have a testId, otherwise dashboard
              if (centerView.kind === "execution" && centerView.testId) {
                state.setCenterView({ kind: "detail", testId: centerView.testId });
                state.fetchExecutions(centerView.testId);
              } else {
                state.goToDashboard();
              }
            }}
          />
        );
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-zinc-950">
      {/* Left Sidebar — hidden when recording */}
      {!state.isRecording && (
        <div
          ref={state.sidebarRef}
          className="flex flex-col overflow-hidden relative border-r border-white/[0.04]"
          style={{
            width: state.sidebarWidth,
            transition: state.isResizing ? "none" : "width 0.2s",
          }}
        >
          <TestsSidebar
            tests={state.tests}
            groups={state.groups}
            selectedTestId={state.selectedTestId}
            onSelectTest={state.selectTest}
            onCreateTest={() => state.createTest()}
            onCreateGroup={async () => {
              const name = window.prompt("Enter new group name:");
              if (name) {
                await state.createGroup(name);
              }
            }}
            onDeleteTest={handleDeleteTest}
            onRunTest={state.runTest}
            isRunning={state.isRunning}
            runningTestId={state.runningTestId}
          />

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors z-50"
            onMouseDown={state.startResizing}
          />
        </div>
      )}

      {/* Center Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full min-w-0">
        {renderCenterView()}
      </div>

      {/* Right Sidebar — AI — hidden when recording */}
      {!state.isRecording && (
        <AIRightSidebar
          selectedRepo={selectedRepo}
          basePath={basePath}
          projectPath={projectPath}
          agentTools={agentTools}
          viewMode={viewMode}
          workDocIsDraft={workDocIsDraft}
          testViewMode={testViewMode}
          testOutput={state.executionLogs.join("\n")}
          isTestRunning={state.isRunning}
          onRunTest={handleRunTest}
          contextKey="tests"
        />
      )}
    </div>
  );
}
