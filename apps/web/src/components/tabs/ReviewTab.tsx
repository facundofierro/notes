import * as React from "react";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
import DiskUsageChart from "@/components/DiskUsageChart"; 
import { AIRightSidebar } from "@/components/AIRightSidebar";
import { LocalChangesPanel } from "@/components/git/LocalChangesPanel";
import { GitHubPRsPanel } from "@/components/git/GitHubPRsPanel";
import { DiffView } from "@/components/git/DiffView";
import { useHomeStore } from "@/store/useHomeStore";
import { 
  Folder, 
  GitBranch, 
  Github, 
  Plus, 
  X, 
  Layers, 
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  size?: number; 
}

type LeftSidebarView = "files" | "changes" | "prs";

interface TabItem {
  id: string;
  label: string;
  icon?: any;
}

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
  
  const [tabs, setTabs] = React.useState<TabItem[]>([
    { id: "main", label: "Project", icon: Layers },
  ]);
  const [activeTabId, setActiveTabId] = React.useState("main");

  // Local state for folder selection
  const [selectedFolder, setSelectedFolder] = React.useState<FileNode | null>(null);

  // Git specific state
  const [selectedGitFile, setSelectedGitFile] = React.useState<any | null>(null);
  const [diffOriginal, setDiffOriginal] = React.useState("");
  const [diffModified, setDiffModified] = React.useState("");

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

  // Handle Git File Select
  const handleGitFileSelect = async (file: any) => {
     setSelectedGitFile(file);
     // Clear other selections to switch view
     setSelectedFile(null);
     setSelectedFolder(null);

     if (projectPath) {
        // Fetch content for diff
        // Original: HEAD
        try {
          const resOrig = await fetch(`/api/git?action=content&path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file.path)}&ref=HEAD`);
          if (resOrig.ok) {
             const data = await resOrig.json();
             setDiffOriginal(data.content || "");
          } else {
             setDiffOriginal(""); // New file?
          }
        } catch {
             setDiffOriginal(""); 
        }

        // Modified: Current content (from disk)
        // We can use the generic generic /api/file?path=... endpoint which reads fs
        try {
           const resMod = await fetch(`/api/file?path=${encodeURIComponent(projectPath + "/" + file.path)}`); // file.path is relative in git status usually! Wait, git status --porcelain usually returns relative to root, but let's double check. 
           // In LocalChangesPanel we use file.path as returned by porcelain. 
           // If 'git status' ran in repo root, paths are relative. 
           // LocalChangesPanel uses repoPath logic, so paths are relative.
           // API /api/file expects absolute path usually? 
           // Looking at FileBrowser it sends `node.path` which is usually absolute in this app's logic?
           // The API /api/project/git returns paths from porcelain. 
           // I need to construct absolute path for /api/file.
           const absolutePath = `${projectPath}/${file.path}`.replace(/\/+/g, "/");
           const resModContent = await fetch(`/api/file?path=${encodeURIComponent(absolutePath)}`).then(r => r.json());
           setDiffModified(resModContent.content || "");
        } catch {
           setDiffModified("");
        }
     }
  };

  const handleSaveFileShim = async ({ content }: { content: string }) => {
    if (!selectedFile) return;
    await saveFile({ path: selectedFile.path, content });
  };

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
     setSelectedFolder(null); // Clear folder selection
     setSelectedGitFile(null); // Clear git selection
  };

  const onFolderSelectWrapper = (node: FileNode) => {
      setSelectedFolder(node);
      setSelectedFile(null); // Clear file selection
      setSelectedGitFile(null); // Clear git selection
  }

  // Update Left Sidebar View handlers to clear generic selections if switching?
  // Actually, keeping selection state separate is fine, but we determine what to show based on what is not null?
  // Or priority? 
  // Let's rely on what was clicked last.
  // When switching sidebar view, we might want to stay on current content unless user clicks something.

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-background">
      {/* Left Content Sidebar (File Browser / Changes / PRs) */}
      <div className={`flex flex-col overflow-hidden bg-secondary/5 ${leftSidebarView !== "files" ? "w-64 border-r border-border" : ""}`}>
        {/* Navigation Header */}
        <div className="flex items-center border-b border-border bg-background/50">
          <button 
            onClick={() => setLeftSidebarView("files")}
            className={`flex-1 flex items-center justify-center py-3 transition-colors border-b-2 ${
              leftSidebarView === "files" 
                ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            title="Project Files"
          >
            <Folder className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLeftSidebarView("changes")}
            className={`flex-1 flex items-center justify-center py-3 transition-colors border-b-2 ${
              leftSidebarView === "changes" 
                ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            title="Local Changes"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLeftSidebarView("prs")}
            className={`flex-1 flex items-center justify-center py-3 transition-colors border-b-2 ${
              leftSidebarView === "prs" 
                ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            title="GitHub PRs"
          >
            <Github className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {leftSidebarView === "files" ? (
            <FileBrowser
              fileTree={fileTree}
              currentPath={currentPath}
              onFileSelect={onFileSelectWrapper}
              onFolderSelect={onFolderSelectWrapper}
              basePath={basePath}
              onRefresh={loadFileTree}
            />
          ) : leftSidebarView === "changes" ? (
            projectPath ? (
              <LocalChangesPanel 
                repoPath={projectPath} 
                onSelectFile={handleGitFileSelect}
                selectedFile={selectedGitFile?.path}
              />
            ) : (
                <div className="p-4 text-xs text-muted-foreground">Select a repository first</div>
            )
          ) : (
            projectPath ? (
              <GitHubPRsPanel repoPath={projectPath} />
            ) : (
              <div className="p-4 text-xs text-muted-foreground">Select a repository first</div>
            )
          )}
        </div>
      </div>

      {/* Central Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-border bg-secondary/10 items-center overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            // Determine label based on selection if active
            let label = tab.label;
            if (activeTabId === tab.id) {
                if (selectedFile) label = selectedFile.path.split('/').pop() || label;
                else if (selectedFolder) label = selectedFolder.name || label;
                else if (selectedGitFile) label = `${selectedGitFile.path.split('/').pop()} (Diff)` || label;
            }

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-border transition-colors min-w-[120px] max-w-[200px] group ${
                  activeTabId === tab.id 
                    ? "bg-background text-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
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

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative">
           {selectedGitFile ? (
             <DiffView 
                original={diffOriginal} 
                modified={diffModified} 
                className="bg-background"
                language={selectedGitFile.path.endsWith('.ts') ? 'typescript' : 'plaintext'} 
             />
           ) : selectedFile ? (
            <div className="flex flex-col h-full">
               <FileViewer
                  file={selectedFile}
                  onSave={handleSaveFileShim}
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

