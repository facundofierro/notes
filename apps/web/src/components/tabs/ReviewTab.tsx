import * as React from "react";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
import DiskUsageChart from "@/components/DiskUsageChart"; // Import the new component
import { AIRightSidebar } from "@/components/AIRightSidebar";
import { useHomeStore } from "@/store/useHomeStore";
import { 
  Folder, 
  GitBranch, 
  Github, 
  Plus, 
  X, 
  Layers, 
  Search,
  ChevronRight
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  size?: number; // Add size
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
  
  // Single tab default + dynamic tabs logic if needed, but per request "keep 1 tab and the plus button"
  // We'll start with just one tab.
  const [tabs, setTabs] = React.useState<TabItem[]>([
    { id: "main", label: "Project", icon: Layers },
  ]);
  const [activeTabId, setActiveTabId] = React.useState("main");

  // Local state for folder selection
  const [selectedFolder, setSelectedFolder] = React.useState<FileNode | null>(null);

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      // Changed to root=true to get full project tree
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
  }, [selectedRepo]); // removed selectedFolder and selectedFile from dependency to avoid loop resetting

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

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
  };

  const onFolderSelectWrapper = (node: FileNode) => {
      setSelectedFolder(node);
      setSelectedFile(null); // Clear file selection
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-background">
      {/* Left Narrow Sidebar */}
      <div className="w-12 border-r border-border bg-secondary/20 flex flex-col items-center py-4 gap-4">
        <button 
          onClick={() => setLeftSidebarView("files")}
          className={`p-2 rounded-lg transition-colors ${leftSidebarView === "files" ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-accent"}`}
          title="Files"
        >
          <Folder className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setLeftSidebarView("changes")}
          className={`p-2 rounded-lg transition-colors ${leftSidebarView === "changes" ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-accent"}`}
          title="Changes"
        >
          <GitBranch className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setLeftSidebarView("prs")}
          className={`p-2 rounded-lg transition-colors ${leftSidebarView === "prs" ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-accent"}`}
          title="GitHub PRs"
        >
          <Github className="w-5 h-5" />
        </button>
      </div>

      {/* Left Content Sidebar (File Browser / Changes / PRs) */}
      <div className="w-64 border-r border-border flex flex-col overflow-hidden bg-secondary/5">
        <div className="p-3 border-b border-border font-medium text-xs uppercase tracking-wider text-muted-foreground flex justify-between items-center">
          <span>{leftSidebarView === "files" ? "Project Files" : leftSidebarView === "changes" ? "Local Changes" : "GitHub PRs"}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {leftSidebarView === "files" ? (
            <FileBrowser
              fileTree={fileTree}
              onFileSelect={onFileSelectWrapper}
              onFolderSelect={onFolderSelectWrapper}
              currentPath={currentPath}
              basePath={basePath}
              onRefresh={loadFileTree}
            />
          ) : leftSidebarView === "changes" ? (
            <div className="p-4 text-sm text-muted-foreground italic">
              Git changes view not implemented yet.
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground italic">
              GitHub PRs view not implemented yet.
            </div>
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
           {selectedFile ? (
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
