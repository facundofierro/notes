import * as React from "react";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
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
    { id: "dashboard", label: "Dashboard", icon: Layers },
    { id: "reviews", label: "Reviews", icon: Search },
  ]);
  const [activeTabId, setActiveTabId] = React.useState("dashboard");

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}&path=work/review`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
        });
    }
  }, [selectedRepo]);

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
              onFileSelect={handleFileSelect}
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
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-border transition-colors min-w-[120px] group ${
                  activeTabId === tab.id 
                    ? "bg-background text-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span className="truncate flex-1">{tab.label}</span>
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
          {activeTabId === "dashboard" ? (
            <div className="p-8 h-full overflow-auto">
              <h1 className="text-2xl font-bold mb-4">Review Dashboard</h1>
              <p className="text-muted-foreground mb-8">Welcome to the review center. Here you can see an overview of your code quality and pending reviews.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl border border-border bg-secondary/10">
                  <h3 className="font-semibold mb-2">Pending Changes</h3>
                  <div className="text-3xl font-bold text-amber-500">12</div>
                  <p className="text-xs text-muted-foreground mt-1">Files modified locally</p>
                </div>
                <div className="p-6 rounded-xl border border-border bg-secondary/10">
                  <h3 className="font-semibold mb-2">Open PRs</h3>
                  <div className="text-3xl font-bold text-blue-500">3</div>
                  <p className="text-xs text-muted-foreground mt-1">Waiting for review</p>
                </div>
                <div className="p-6 rounded-xl border border-border bg-secondary/10">
                  <h3 className="font-semibold mb-2">Resolved Issues</h3>
                  <div className="text-3xl font-bold text-green-500">45</div>
                  <p className="text-xs text-muted-foreground mt-1">In the last 30 days</p>
                </div>
              </div>
            </div>
          ) : activeTabId === "reviews" ? (
             <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/5">
                   <h2 className="font-semibold">Code Reviews</h2>
                   <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs bg-secondary border border-border rounded-md hover:bg-accent">Filter</button>
                      <button className="px-3 py-1 text-xs bg-amber-500 text-white rounded-md hover:bg-amber-600 font-medium">New Review</button>
                   </div>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                   <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 border border-border rounded-lg hover:bg-secondary/10 cursor-pointer flex justify-between items-center group">
                           <div>
                              <div className="font-medium">Refactor Authentication Logic</div>
                              <div className="text-xs text-muted-foreground mt-1 flex gap-2 items-center">
                                 <span className="flex items-center gap-1"><Github className="w-3 h-3" /> #245</span>
                                 <span>•</span>
                                 <span>Updated 2 hours ago</span>
                              </div>
                           </div>
                           <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          ) : selectedFile ? (
            <div className="flex flex-col h-full">
               <FileViewer
                  file={selectedFile}
                  onSave={handleSaveFileShim}
                  onFileSaved={loadFileTree}
               />
            </div>
          ) : (
            <div className="flex flex-1 justify-center items-center text-muted-foreground h-full">
              Select a file or view from the sidebars
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
      />
    </div>
  );
}
