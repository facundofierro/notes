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
  const [taskSubView, setTaskSubView] = React.useState<"task" | "plan" | "tests">("task");
  const [planFile, setPlanFile] = React.useState<FileNode | null>(null);
  const [planPathForAI, setPlanPathForAI] = React.useState<string | null>(null);

  // Extract plan path from task file content
  const planPath = React.useMemo(() => {
    if (!file?.content || viewMode !== "tasks") return null;
    
    // Check frontmatter
    const fmMatch = file.content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
       const planLine = fmMatch[1].split('\n').find(l => l.trim().startsWith('plan:'));
       if (planLine) {
         const val = planLine.split(':')[1].trim();
         // resolve relative path if needed, but user said .agelum/work/plans/...
         // If it starts with ./ or /, explicit. Otherwise assume relative? 
         // User said "relative to the selected project path".
         // Let's return as is and handle fetching.
         return val;
       }
    }
    return null;
  }, [file, viewMode]);


  // Validate plan file existence and content for AI usage
  React.useEffect(() => {
    if (!planPath) {
      setPlanPathForAI(null);
      return;
    }

    let fetchPath = planPath;
    if (!planPath.startsWith("/") && basePath && selectedRepo) {
       fetchPath = `${basePath}/${selectedRepo}/${planPath}`.replace(/\/+/g, "/");
    }
    
    fetch(`/api/file?path=${encodeURIComponent(fetchPath)}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Plan file not found");
      })
      .then(data => {
        // Check if file has content (at least 10 lines)
        const lineCount = (data.content || '').split('\n').length;
        if (lineCount >= 10) {
          setPlanPathForAI(fetchPath);
        } else {
          setPlanPathForAI(null);
        }
      })
      .catch(err => {
        console.error("Failed to validate plan file:", err);
        setPlanPathForAI(null);
      });
  }, [planPath, basePath, selectedRepo]);
  // Fetch plan content
  React.useEffect(() => {
    if (taskSubView === "plan" && planPath && (!planFile || planFile.path !== planPath)) {
      // If path is relative to project root, we need to make sure we query correctly.
      // The /api/file endpoint usually takes an absolute path or relative to project?
      // Based on existing code, it seems to expect absolute paths mostly, but let's see.
      // The app likely handles resolving.
      // We can try to construct absolute path if possible.
      
      let fetchPath = planPath;
      if (!planPath.startsWith("/") && basePath && selectedRepo) {
         fetchPath = `${basePath}/${selectedRepo}/${planPath}`.replace(/\/+/g, "/");
      }
      
      fetch(`/api/file?path=${encodeURIComponent(fetchPath)}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Plan file not found");
        })
        .then(data => setPlanFile({ path: fetchPath, content: data.content }))
        .catch(err => {
          console.error("Failed to fetch plan:", err);
          setPlanFile(null);
        });
    }
  }, [taskSubView, planPath, basePath, selectedRepo, planFile]);

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
      }
    }
  };

  const showTaskSwitcher = 
    (viewMode === "tasks" || viewMode === "kanban") || 
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
         onClick={() => setTaskSubView("tests")} 
         className={`flex items-center gap-1.5 px-3 h-full rounded-md text-xs font-medium transition-colors ${taskSubView === "tests" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
       >
         <ListChecks className="w-3.5 h-3.5" />
         Tests
       </button>
     </div>
  ) : null;

  // Common header component for consistent layout across views
  const EditorHeader = ({ extraContent }: { extraContent?: React.ReactNode }) => (
    <div className="flex justify-between items-center p-3 border-b bg-secondary border-border">
      <div className="flex gap-2 items-center">
        <button
          onClick={onBack}
          className="p-1 mr-1 rounded transition-colors text-muted-foreground hover:text-white hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground truncate">
          {file.path.split('/').pop()}
        </span>
      </div>
      {headerCenter && (
         <div className="flex-grow flex justify-center px-4 min-w-0">
           {headerCenter}
         </div>
      )}
      <div className="flex gap-2 items-center">
          {extraContent}
      </div>
    </div>
  );

  return (
    <div className="flex w-full h-full">
      <div className="flex overflow-hidden flex-1 border-r border-border">
        {taskSubView === "tests" ? (
          <div className="flex flex-col flex-1 h-full bg-background">
             <EditorHeader />
             <TaskTests taskPath={file.path} repo={selectedRepo} />
          </div>
        ) : taskSubView === "plan" && !planPath ? (
           <div className="flex flex-col flex-1 bg-background">
              <EditorHeader />
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
                <div className="bg-secondary/20 p-4 rounded-full mb-4">
                  <LayoutList className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Plan Linked</h3>
                <p className="max-w-md mb-6 text-sm">This task doesn&apos;t have a linked plan yet. Use the Agent &quot;Plan&quot; mode in the right sidebar to generate one.</p>
                <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded border border-border">
                  <p>Trigger the Plan agent to automatically create and link a plan file.</p>
                </div>
              </div>
           </div>
        ) : (
          <FileViewer
            file={taskSubView === "plan" ? planFile : file}
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
            allowEdit={taskSubView === "task"}
          />
        )}
      </div>
      <AIRightSidebar
        selectedRepo={selectedRepo}
        basePath={basePath}
        projectPath={projectPath}
        agentTools={agentTools}
        viewMode={viewMode}
        file={file ? { ...file, planPath: planPathForAI } as any : null} // Pass planPath so start mode can use plan file
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