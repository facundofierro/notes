import * as React from "react";
import FileBrowser from "@/components/features/file-system/FileBrowser";
import FileViewer from "@/components/features/file-system/FileViewer";
import DiskUsageChart from "@/components/shared/DiskUsageChart"; 
import { AIRightSidebar } from "@/components/layout/AIRightSidebar";
import { LocalChangesPanel } from "@/components/features/git/LocalChangesPanel";
import { GitHubPRsPanel } from "@/components/features/git/GitHubPRsPanel";
import { DiffView } from "@/components/features/git/DiffView";
import { useHomeStore } from "@/store/useHomeStore";
import { 
  Folder, 
  GitBranch, 
  Github, 
  Plus, 
  X, 
  Layers, 
  Bot,
  FileDiff,
  Info
} from "lucide-react";
import { cn } from "@agelum/shadcn";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  size?: number; 
}

type LeftSidebarView = "files" | "changes" | "prs";
type ChangesTab = "agent" | "diff";
type PRsTab = "info" | "diff";

// --- Sub-components for Central Areas ---

// 1. Files View Central Area
const FilesCentralArea = ({ 
  selectedFile, 
  selectedFolder, 
  onSaveFile, 
  loadFileTree,
  tabs,
  activeTabId,
  setActiveTabId,
  removeTab,
  addTab
}: any) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Existing Dynamic Tabs Header for Files View */}
      <div className="flex border-b border-border bg-secondary/10 items-center overflow-x-auto no-scrollbar">
          {tabs.map((tab: any) => {
            const Icon = tab.icon;
            let label = tab.label;
            if (activeTabId === tab.id) {
                if (selectedFile) label = selectedFile.path.split('/').pop() || label;
                else if (selectedFolder) label = selectedFolder.name || label;
            }

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-border transition-colors min-w-[120px] max-w-[200px] group",
                  activeTabId === tab.id 
                    ? "bg-background text-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span className="truncate flex-1">{label}</span>
                {tabs.length > 1 && (
                  <button 
                    onClick={(e) => removeTab(e, tab.id)}
                    className="p-0.5 rounded-sm hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          <button 
            onClick={addTab}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Add Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
           {selectedFile ? (
            <div className="flex flex-col h-full">
               <FileViewer
                  file={selectedFile}
                  onSave={onSaveFile}
                  onFileSaved={loadFileTree}
               />
            </div>
          ) : selectedFolder ? (
            <div className="flex flex-col h-full">
                <DiskUsageChart node={selectedFolder} />
            </div>
          ) : (
            <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
              Select a file or folder
            </div>
          )}
        </div>
    </div>
  );
};

// 2. Local Changes Central Area
const ChangesCentralArea = ({ 
  selectedGitFile, 
  diffOriginal, 
  diffModified
}: any) => {
  const [activeTab, setActiveTab] = React.useState<ChangesTab>("agent");

  // Auto-switch to diff tab if a file is selected
  React.useEffect(() => {
    if (selectedGitFile) {
      setActiveTab("diff");
    }
  }, [selectedGitFile]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Fixed Tabs Header */}
      <div className="flex border-b border-border bg-secondary/10 items-center">
        <button
          onClick={() => setActiveTab("agent")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "agent" ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent Review</span>
        </button>
        <button
          onClick={() => setActiveTab("diff")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "diff" ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>Diff View</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {activeTab === "agent" ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">AI Agent Review</h3>
            <p className="max-w-md text-sm opacity-80">
              Run specialized agents to review your local changes for bugs, security issues, and code quality improvements.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="p-4 border border-border rounded-lg bg-secondary/5 text-left">
                    <div className="font-medium mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Security Audit</div>
                    <div className="text-xs opacity-70">Check for vulnerabilities in your changes</div>
                </div>
                 <div className="p-4 border border-border rounded-lg bg-secondary/5 text-left">
                    <div className="font-medium mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Code Quality</div>
                    <div className="text-xs opacity-70">Linting and best practices review</div>
                </div>
            </div>
          </div>
        ) : (
          selectedGitFile ? (
            <DiffView 
                original={diffOriginal} 
                modified={diffModified} 
                className="bg-background"
                language={selectedGitFile.path?.endsWith('.ts') || selectedGitFile.path?.endsWith('.tsx') ? 'typescript' : 'plaintext'} 
            />
          ) : (
             <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
               Select a file to view diff
             </div>
          )
        )}
      </div>
    </div>
  );
};

// 3. GitHub PRs Central Area
const PRsCentralArea = ({ 
  selectedPRFile,
  diffOriginal, 
  diffModified
}: any) => {
  const [activeTab, setActiveTab] = React.useState<PRsTab>("info");

  // Auto-switch to diff tab if a file is selected (logic similar to Changes)
  // For now we don't have selectedPRFile trigger fully wired from PR panel likely
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
       {/* Fixed Tabs Header */}
       <div className="flex border-b border-border bg-secondary/10 items-center">
        <button
          onClick={() => setActiveTab("info")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "info" ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          <Info className="w-3.5 h-3.5" />
          <span>PR Info</span>
        </button>
        <button
          onClick={() => setActiveTab("diff")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm border-r border-border transition-colors",
            activeTab === "diff" ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>Diff View</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
         {activeTab === "info" ? (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <Github className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">Pull Request Details</h3>
                <p className="max-w-md text-sm opacity-80">
                  Select a PR to view its description, comments, and review status.
                </p>
             </div>
         ) : (
             /* Diff View Placeholder until wired up */
             <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
               Select a file in PR to view diff
             </div>
         )}
      </div>
    </div>
  );
};


export function ReviewTab() {
  const store = useHomeStore();
  const { 
    selectedRepo, 
    basePath, 
    repositories,
    settings,
    setSelectedFile,
    handleFileSelect,
    handleRunTest,
    saveFile,
    agentTools,
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
    selectedFile,
    currentPath,
    viewMode,
    workDocIsDraft,
    testViewMode,
    testOutput,
    isTestRunning
  } = store.getProjectState();

  const [fileTree, setFileTree] = React.useState<FileNode | null>(null);
  const [leftSidebarView, setLeftSidebarView] = React.useState<LeftSidebarView>("files");
  
  // -- Files View State --
  const [tabs, setTabs] = React.useState<any[]>([
    { id: "main", label: "Project", icon: Layers },
  ]);
  const [activeTabId, setActiveTabId] = React.useState("main");
  const [selectedFolder, setSelectedFolder] = React.useState<FileNode | null>(null);

  // -- Changes View State --
  const [selectedGitFile, setSelectedGitFile] = React.useState<any | null>(null);
  const [changesDiffOriginal, setChangesDiffOriginal] = React.useState("");
  const [changesDiffModified, setChangesDiffModified] = React.useState("");

  // -- PRs View State --
  const [selectedPRFile, setSelectedPRFile] = React.useState<any | null>(null);

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}&root=true`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
          // If no folder selected and no file selected, select root folder by default
          if (!selectedFolder && !selectedFile && data.tree) {
             setSelectedFolder(data.tree);
          }
        });
    }
  }, [selectedRepo]); 

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);


  // Handle Git File Select for Changes View
  const handleGitFileSelect = async (file: any) => {
     setSelectedGitFile(file);
     // Note: We don't clear selectedFile/selectedFolder anymore as they are separate views

     if (projectPath) {
        let refOriginal = "HEAD";
        let refModified: string | undefined = undefined; // undefined means read from file system

        if (file.commitHash) {
           // It's a committed file
           refOriginal = `${file.commitHash}~1`;
           refModified = file.commitHash;
        }

        // Fetch content for diff
        // Original
        try {
          const resOrig = await fetch(`/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(refOriginal)}`);
          if (resOrig.ok) {
             const data = await resOrig.json();
             setChangesDiffOriginal(data.content || "");
          } else {
             setChangesDiffOriginal(""); // New file?
          }
        } catch {
             setChangesDiffOriginal(""); 
        }

        // Modified
        try {
           if (refModified) {
               // Fetch from git (commit hash)
               const resMod = await fetch(`/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(refModified)}`);
               if (resMod.ok) {
                  const data = await resMod.json();
                  setChangesDiffModified(data.content || "");
               } else {
                  setChangesDiffModified(""); 
               }
           } else {
               // Fetch from FS
               const absolutePath = `${projectPath}/${file.path}`.replace(/\/+/g, "/");
               const resModContent = await fetch(`/api/file?path=${encodeURIComponent(absolutePath)}`).then(r => r.json());
               setChangesDiffModified(resModContent.content || "");
           }
        } catch {
           setChangesDiffModified("");
        }
     }
  };

  const handleSaveFileShim = async ({ content }: { content: string }) => {
    if (!selectedFile) return;
    await saveFile({ path: selectedFile.path, content });
  };

  // Files View Tab Handlers
  const removeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const addTab = () => {
    const newId = `tab-${Date.now()}`;
    setTabs([...tabs, { id: newId, label: "New Tab" }]);
    setActiveTabId(newId);
  };

  const onFileSelectWrapper = (node: FileNode) => {
     handleFileSelect(node);
     setSelectedFolder(null); // Clear folder selection in files view
  };

  const onFolderSelectWrapper = (node: FileNode) => {
      setSelectedFolder(node);
      setSelectedFile(null); // Clear file selection in files view
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-background">
      {/* Left Sidebar */}
      <div className={`flex flex-col overflow-hidden bg-secondary/5 ${leftSidebarView ? "w-64 border-r border-border" : ""}`}>
        {/* Navigation Header */}
        <div className="flex items-center border-b border-border bg-background/50">
          <button 
            onClick={() => setLeftSidebarView("files")}
            className={cn(
              "flex-1 flex items-center justify-center py-3 transition-colors border-b-2",
              leftSidebarView === "files" 
                ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            title="Project Files"
          >
            <Folder className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLeftSidebarView("changes")}
            className={cn(
              "flex-1 flex items-center justify-center py-3 transition-colors border-b-2",
              leftSidebarView === "changes" 
                ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            title="Local Changes"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLeftSidebarView("prs")}
            className={cn(
              "flex-1 flex items-center justify-center py-3 transition-colors border-b-2",
              leftSidebarView === "prs" 
                ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            title="GitHub PRs"
          >
            <Github className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Content - Rendered all 3 with display toggle */}
        <div className="flex-1 overflow-hidden relative">
          
          <div className={cn("h-full w-full", leftSidebarView === "files" ? "block" : "hidden")}>
             <FileBrowser
              fileTree={fileTree}
              currentPath={currentPath}
              onFileSelect={onFileSelectWrapper}
              onFolderSelect={onFolderSelectWrapper}
              basePath={basePath}
              onRefresh={loadFileTree}
            />
          </div>

          <div className={cn("h-full w-full flex flex-col", leftSidebarView === "changes" ? "flex" : "hidden")}>
             {projectPath ? (
              <LocalChangesPanel 
                repoPath={projectPath} 
                onSelectFile={handleGitFileSelect}
                selectedFile={selectedGitFile?.path}
                className="flex-1"
              />
            ) : (
                <div className="p-4 text-xs text-muted-foreground">Select a repository first</div>
            )}
          </div>

          <div className={cn("h-full w-full flex flex-col", leftSidebarView === "prs" ? "flex" : "hidden")}>
             {projectPath ? (
              <GitHubPRsPanel repoPath={projectPath} />
            ) : (
              <div className="p-4 text-xs text-muted-foreground">Select a repository first</div>
            )}
          </div>
        </div>
      </div>

      {/* Central Content Areas - Rendered ALL 3 times as requested */}
      
      {/* 1. Files View Central Area */}
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", leftSidebarView === "files" ? "flex" : "hidden")}>
         <FilesCentralArea 
            selectedFile={selectedFile}
            selectedFolder={selectedFolder}
            onSaveFile={handleSaveFileShim}
            loadFileTree={loadFileTree}
            tabs={tabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            removeTab={removeTab}
            addTab={addTab}
         />
      </div>

      {/* 2. Changes View Central Area */}
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", leftSidebarView === "changes" ? "flex" : "hidden")}>
         <ChangesCentralArea 
            selectedGitFile={selectedGitFile}
            diffOriginal={changesDiffOriginal}
            diffModified={changesDiffModified}
         />
      </div>

      {/* 3. PRs View Central Area */}
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", leftSidebarView === "prs" ? "flex" : "hidden")}>
         <PRsCentralArea 
            selectedPRFile={selectedPRFile}
            // Add diff props later
         />
      </div>


      {/* Right Sidebar - AI Assistant */}
      <AIRightSidebar
        selectedRepo={selectedRepo}
        basePath={basePath}
        projectPath={projectPath}
        agentTools={agentTools}
        viewMode={viewMode}
        file={selectedFile}
        workDocIsDraft={workDocIsDraft}
        testViewMode={testViewMode}
        testOutput={testOutput}
        isTestRunning={isTestRunning}
        onRunTest={handleRunTest}
        contextKey={selectedFile ? `review:${selectedFile.path}` : "review"}
      />
    </div>
  );
}
