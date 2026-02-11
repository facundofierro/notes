"use client";

import * as React from "react";
import FileViewer from "@/components/features/file-system/FileViewer";
import { AIRightSidebar } from "@/components/layout/AIRightSidebar";

interface FileNode {
  path: string;
  content: string;
}

interface WorkEditorProps {
  file: FileNode;
  onFileChange: (file: FileNode | null) => void;
  onBack: () => void;
  onRename?: (
    newTitle: string,
  ) => Promise<{ path: string; content: string } | void>;
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
  contextKey?: string;
  onSave?: (opts: { path: string; content: string }) => Promise<void>;
}

import { TaskTests } from "./TaskTests";
import { LayoutList, FileText, ListChecks, ArrowLeft } from "lucide-react";

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
  contextKey,
  onSave,
}: WorkEditorProps) {
  const [taskSubView, setTaskSubView] = React.useState<
    "task" | "plan" | "tests" | "summary"
  >("task");
  const [planFile, setPlanFile] = React.useState<FileNode | null>(null);
  const [planLoading, setPlanLoading] = React.useState(false);
  const [planPathForAI, setPlanPathForAI] = React.useState<string | null>(null);
  const [testsPath, setTestsPath] = React.useState<string | null>(null);
  const [summaryFile, setSummaryFile] = React.useState<FileNode | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);

  // Extract plan path from task file content
  const planPath = React.useMemo(() => {
    const isTaskView = viewMode === "tasks" || viewMode === "kanban";
    if (!file?.content || !isTaskView) return null;

    // Check frontmatter with flexible line endings
    const fmMatch = file.content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const planLine = fmMatch[1]
        .split(/\r?\n/)
        .find((l) => l.trim().startsWith("plan:"));
      if (planLine) {
        const val = planLine.split(":")[1].trim();
        console.log("[WorkEditor] Extracted plan path from frontmatter:", val);
        return val;
      }
    }
    console.log(
      "[WorkEditor] No plan path found in frontmatter or regex failed",
    );
    return null;
  }, [file, viewMode]);

  // Extract summary path from task file content
  const summaryPath = React.useMemo(() => {
    const isTaskView = viewMode === "tasks" || viewMode === "kanban";
    if (!file?.content || !isTaskView) return null;

    // Check frontmatter with flexible line endings
    const fmMatch = file.content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const summaryLine = fmMatch[1]
        .split(/\r?\n/)
        .find((l) => l.trim().startsWith("summary:"));
      if (summaryLine) {
        const val = summaryLine.split(":")[1].trim();
        return val;
      }
    }
    return null;
  }, [file, viewMode]);

  // Extract tests path from task file content
  React.useEffect(() => {
    const isTaskView = viewMode === "tasks" || viewMode === "kanban";
    if (!file?.content || !isTaskView) {
      setTestsPath(null);
      return;
    }

    // Check frontmatter for tests field with flexible line endings
    const fmMatch = file.content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const testsLine = fmMatch[1]
        .split(/\r?\n/)
        .find((l) => l.trim().startsWith("tests:"));
      if (testsLine) {
        const val = testsLine.split(":")[1].trim();
        setTestsPath(val);
        return;
      }
    }
    setTestsPath(null);
  }, [file, viewMode]);

  // Validate plan file existence and content for AI usage
  React.useEffect(() => {
    if (!planPath) {
      setPlanPathForAI(null);
      return;
    }

    let fetchPath = planPath;
    if (!planPath.startsWith("/") && projectPath) {
      fetchPath = `${projectPath}/${planPath}`.replace(/\/+/g, "/");
    } else if (!planPath.startsWith("/") && basePath && selectedRepo) {
      fetchPath = `${basePath}/${selectedRepo}/${planPath}`.replace(
        /\/+/g,
        "/",
      );
    }

    fetch(`/api/file?path=${encodeURIComponent(fetchPath)}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Plan file not found");
      })
      .then((data) => {
        // If file exists, we can use it for AI. Removed line count restriction to be safe.
        if (data.content !== undefined) {
          setPlanPathForAI(fetchPath);
        } else {
          setPlanPathForAI(null);
        }
      })
      .catch((err) => {
        console.error("Failed to validate plan file:", err);
        setPlanPathForAI(null);
      });
  }, [planPath, projectPath, basePath, selectedRepo]);

  // Fetch plan content when switching to plan view
  React.useEffect(() => {
    console.log("[WorkEditor] Plan fetch effect triggered", {
      taskSubView,
      planPath,
      planFileLoaded: !!planFile,
      basePath,
      selectedRepo,
    });

    if (taskSubView === "plan" && planPath) {
      let fetchPath = planPath;
      if (!planPath.startsWith("/") && projectPath) {
        fetchPath = `${projectPath}/${planPath}`.replace(/\/+/g, "/");
      } else if (!planPath.startsWith("/") && basePath && selectedRepo) {
        fetchPath = `${basePath}/${selectedRepo}/${planPath}`.replace(
          /\/+/g,
          "/",
        );
      }

      // Only fetch if we don't have the plan file loaded or if the path (absolute) changed
      if (
        !planFile ||
        !planFile.content ||
        fetchPath !== (planFile as any).fullPath
      ) {
        console.log("[WorkEditor] Fetching plan file:", fetchPath);
        setPlanLoading(true);

        fetch(`/api/file?path=${encodeURIComponent(fetchPath)}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error(
              `Plan file not found: ${res.status} ${res.statusText}`,
            );
          })
          .then((data) => {
            console.log(
              "[WorkEditor] Plan file loaded successfully, content length:",
              data.content?.length,
            );
            // Store with the relative path from frontmatter but also store absolute path for comparison
            setPlanFile({
              path: planPath,
              content: data.content,
              fullPath: fetchPath,
            } as any);
            setPlanLoading(false);
          })
          .catch((err) => {
            console.error("[WorkEditor] Failed to fetch plan:", err);
            setPlanFile(null);
            setPlanLoading(false);
          });
      }
    } else if (taskSubView !== "plan") {
      // Clear plan file when not in plan view
      setPlanLoading(false);
    }
  }, [taskSubView, planPath, projectPath, basePath, selectedRepo, planFile]);

  // Fetch summary content when switching to summary view
  React.useEffect(() => {
    if (taskSubView === "summary" && summaryPath) {
      let fetchPath = summaryPath;
      if (!summaryPath.startsWith("/") && projectPath) {
        fetchPath = `${projectPath}/${summaryPath}`.replace(/\/+/g, "/");
      } else if (!summaryPath.startsWith("/") && basePath && selectedRepo) {
        fetchPath = `${basePath}/${selectedRepo}/${summaryPath}`.replace(
          /\/+/g,
          "/",
        );
      }

      // Only fetch if we don't have the summary file loaded or if the path (absolute) changed
      if (
        !summaryFile ||
        !summaryFile.content ||
        fetchPath !== (summaryFile as any).fullPath
      ) {
        setSummaryLoading(true);

        fetch(`/api/file?path=${encodeURIComponent(fetchPath)}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error(
              `Summary file not found: ${res.status} ${res.statusText}`,
            );
          })
          .then((data) => {
            // Store with the relative path from frontmatter but also store absolute path for comparison
            setSummaryFile({
              path: summaryPath,
              content: data.content,
              fullPath: fetchPath,
            } as any);
            setSummaryLoading(false);
          })
          .catch((err) => {
            console.error("[WorkEditor] Failed to fetch summary:", err);
            setSummaryFile(null);
            setSummaryLoading(false);
          });
      }
    } else if (taskSubView !== "summary") {
      setSummaryLoading(false);
    }
  }, [
    taskSubView,
    summaryPath,
    projectPath,
    basePath,
    selectedRepo,
    summaryFile,
  ]);

  const handleSaveFile = async (opts: { path: string; content: string }) => {
    if (onSave) {
      await onSave(opts);
    } else {
      const res = await fetch("/api/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error("Failed to save file");

      // If saving task, update parent
      if (taskSubView === "task") {
        onFileChange({ path: opts.path, content: opts.content });
      } else if (taskSubView === "plan") {
        setPlanFile({ path: opts.path, content: opts.content });
      } else if (taskSubView === "summary") {
        setSummaryFile({ path: opts.path, content: opts.content });
      }
    }
  };

  const showTaskSwitcher =
    viewMode === "tasks" ||
    viewMode === "kanban" ||
    (!!file && file.path.toLowerCase().includes("tasks"));

  const headerCenter = showTaskSwitcher ? (
    <div className="flex items-center p-1 bg-secondary rounded-lg border border-border h-8">
      <button
        onClick={() => setTaskSubView("task")}
        className={`flex items-center gap-1.5 px-3 h-full rounded-md text-xs font-medium transition-colors ${taskSubView === "task" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <FileText className="w-3.5 h-3.5" />
        Task
      </button>
      <button
        onClick={() => setTaskSubView("plan")}
        className={`flex items-center gap-1.5 px-3 h-full rounded-md text-xs font-medium transition-colors ${taskSubView === "plan" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <LayoutList className="w-3.5 h-3.5" />
        Plan
      </button>
      <button
        onClick={() => setTaskSubView("summary")}
        className={`flex items-center gap-1.5 px-3 h-full rounded-md text-xs font-medium transition-colors ${taskSubView === "summary" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <LayoutList className="w-3.5 h-3.5" />
        Summary
      </button>
      <button
        onClick={() => setTaskSubView("tests")}
        className={`flex items-center gap-1.5 px-3 h-full rounded-md text-xs font-medium transition-colors ${taskSubView === "tests" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <ListChecks className="w-3.5 h-3.5" />
        Tests
      </button>
    </div>
  ) : null;

  // Common header component for consistent layout across views
  const EditorHeader = ({
    extraContent,
  }: {
    extraContent?: React.ReactNode;
  }) => (
    <div className="relative flex justify-between items-center p-3 border-b bg-secondary border-border">
      <div className="relative flex gap-2 items-center z-10">
        <button
          onClick={onBack}
          className="p-1 mr-1 rounded transition-colors text-muted-foreground hover:text-white hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground truncate">
          {file.path.split("/").pop()?.replace(/\.md$/, "")}
        </span>
      </div>
      {headerCenter && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {headerCenter}
        </div>
      )}
      <div className="relative flex gap-2 items-center z-10">
        {extraContent}
      </div>
    </div>
  );

  return (
    <div className="flex w-full h-full">
      <div className="flex overflow-hidden flex-1 border-r border-border">
        {taskSubView === "tests" && !testsPath ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="bg-secondary/20 p-4 rounded-full mb-4">
                <ListChecks className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Tests Linked
              </h3>
              <p className="max-w-md mb-6 text-sm">
                This task doesn&apos;t have linked tests yet. Tests will be
                automatically linked when you create them.
              </p>
              <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded border border-border">
                <p>
                  Tests are stored in .agelum/work/tests/ and linked in the task
                  frontmatter.
                </p>
              </div>
            </div>
          </div>
        ) : taskSubView === "tests" ? (
          <div className="flex flex-col flex-1 h-full bg-background">
            <EditorHeader />
            <TaskTests
              taskPath={file.path}
              repo={selectedRepo}
              testsPath={testsPath}
            />
          </div>
        ) : taskSubView === "plan" && !planPath ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="bg-secondary/20 p-4 rounded-full mb-4">
                <LayoutList className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Plan Linked
              </h3>
              <p className="max-w-md mb-6 text-sm">
                This task doesn&apos;t have a linked plan yet. Use the Agent
                &quot;Plan&quot; mode in the right sidebar to generate one.
              </p>
              <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded border border-border">
                <p>
                  Trigger the Plan agent to automatically create and link a plan
                  file.
                </p>
              </div>
            </div>
          </div>
        ) : taskSubView === "plan" && planLoading ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="w-8 h-8 rounded-full border-2 animate-spin border-muted-foreground border-t-transparent mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Loading Plan...
              </h3>
              <p className="max-w-md text-sm">
                Fetching plan file from {planPath}
              </p>
            </div>
          </div>
        ) : taskSubView === "plan" && !planFile ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="bg-red-900/20 p-4 rounded-full mb-4">
                <LayoutList className="w-8 h-8 text-red-400 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Plan File Not Found
              </h3>
              <p className="max-w-md mb-6 text-sm">
                The plan file at{" "}
                <code className="text-xs bg-secondary/50 px-2 py-1 rounded">
                  {planPath}
                </code>{" "}
                could not be loaded.
              </p>
              <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded border border-border">
                <p>
                  The file may have been moved or deleted. Try regenerating the
                  plan.
                </p>
              </div>
            </div>
          </div>
        ) : taskSubView === "summary" && !summaryPath ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="bg-secondary/20 p-4 rounded-full mb-4">
                <FileText className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Summary Linked
              </h3>
              <p className="max-w-md mb-6 text-sm">
                This task doesn&apos;t have a linked summary yet. Check
                &quot;Summary&quot; when starting the task to create one.
              </p>
            </div>
          </div>
        ) : taskSubView === "summary" && summaryLoading ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="w-8 h-8 rounded-full border-2 animate-spin border-muted-foreground border-t-transparent mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Loading Summary...
              </h3>
              <p className="max-w-md text-sm">
                Fetching summary file from {summaryPath}
              </p>
            </div>
          </div>
        ) : taskSubView === "summary" && !summaryFile ? (
          <div className="flex flex-col flex-1 bg-background">
            <EditorHeader />
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
              <div className="bg-red-900/20 p-4 rounded-full mb-4">
                <FileText className="w-8 h-8 text-red-400 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Summary File Not Found
              </h3>
              <p className="max-w-md mb-6 text-sm">
                The summary file at{" "}
                <code className="text-xs bg-secondary/50 px-2 py-1 rounded">
                  {summaryPath}
                </code>{" "}
                could not be loaded.
              </p>
            </div>
          </div>
        ) : (
          <FileViewer
            file={
              taskSubView === "plan"
                ? planFile
                : taskSubView === "summary"
                  ? summaryFile
                  : file
            }
            onSave={handleSaveFile}
            onFileSaved={onRefresh}
            editing={workEditorEditing}
            onEditingChange={onWorkEditorEditingChange}
            onBack={onBack}
            onRename={taskSubView === "task" ? onRename : undefined}
            isTestFile={viewMode === "tests"}
            testViewMode={testViewMode}
            onTestViewModeChange={onTestViewModeChange}
            testOutput={testOutput}
            isTestRunning={isTestRunning}
            headerCenter={headerCenter}
            defaultRenaming={
              workDocIsDraft &&
              taskSubView === "task" &&
              /^(epic|task|idea)-\d{13}(\.md)?$/.test(
                file.path.split("/").pop() || "",
              )
            }
          />
        )}
      </div>
      <AIRightSidebar
        selectedRepo={selectedRepo}
        basePath={basePath}
        projectPath={projectPath}
        agentTools={agentTools}
        viewMode={viewMode}
        file={file ? ({ ...file, planPath: planPathForAI } as any) : null} // Pass planPath so start mode can use plan file
        // Actually, if we are viewing the Plan, maybe we want the context to be the Plan?
        // But the prompt builder logic I added uses `file.path` to determine context.
        // If I pass `planFile`, it might think it's just a generic file.
        // The user wants to "create the full plan" for "this task".
        // So keeping `file` as the Task file seems correct for the Agent context,
        // especially since `usePromptBuilder` logic checks for `docMode: 'plan'`.
        workDocIsDraft={workDocIsDraft}
        testViewMode={testViewMode}
        testOutput={testOutput}
        isTestRunning={isTestRunning}
        onRunTest={onRunTest}
        contextKey={contextKey}
      />
    </div>
  );
}
