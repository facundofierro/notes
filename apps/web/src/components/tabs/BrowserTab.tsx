import * as React from "react";
import { Globe, ShieldAlert, Plus, X } from "lucide-react";
import { BrowserRightPanel } from "@/components/BrowserRightPanel";
import { IframeCaptureInjector } from "@/components/IframeCaptureInjector";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { useHomeStore } from "@/store/useHomeStore";
import { toast } from "@agelum/shadcn";

export function BrowserTab({ repoName }: { repoName: string }) {
  const isElectron = useHomeStore(s => s.isElectron);
  const selectedRepo = useHomeStore(s => s.selectedRepo);
  const repositories = useHomeStore(s => s.repositories);
  const settings = useHomeStore(s => s.settings);
  const projectStates = useHomeStore(s => s.projectStates);
  const setProjectStateForRepo = useHomeStore(s => s.setProjectStateForRepo);
  const saveProjectConfig = useHomeStore(s => s.saveProjectConfig);
  const preservedIframeUrls = useHomeStore(s => s.preservedIframeUrls);

  const isSelected = selectedRepo === repoName;
  const projectState = projectStates[repoName] || useHomeStore.getState().getProjectState();

  const {
    iframeUrl,
    electronLoadedUrl,
    isIframeInsecure,
    isScreenshotMode,
    screenshot,
    annotations,
    selectedAnnotationId,
    selectedTool,
    projectConfig,
    activeBrowserPageIndex,
    browserPagesCurrentUrls,
  } = projectState;

  const currentProjectConfig = React.useMemo(() => {
    return settings.projects?.find((p) => p.name === repoName) || projectConfig || null;
  }, [repoName, settings.projects, projectConfig]);

  const browserPages = React.useMemo(() => {
    const pages = [];
    const mainUrl = currentProjectConfig?.url || "";
    pages.push(mainUrl);
    
    if (currentProjectConfig?.browserPages) {
      pages.push(...currentProjectConfig.browserPages);
    }
    
    return pages;
  }, [currentProjectConfig]);

  const handleAddPage = async () => {
    const url = window.prompt("Enter URL for new page:");
    if (url) {
      const existingPages = currentProjectConfig?.browserPages || [];
      const newPages = [...existingPages, url];
      await saveProjectConfig({ browserPages: newPages });
      setProjectStateForRepo(repoName, () => ({ activeBrowserPageIndex: browserPages.length }));
    }
  };

  const handleRemovePage = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === 0) return; // Cannot remove main URL
    
    const existingPages = currentProjectConfig?.browserPages || [];
    const newPages = existingPages.filter((_, i) => i !== index - 1);
    await saveProjectConfig({ browserPages: newPages });
    
    if (activeBrowserPageIndex >= index) {
      setProjectStateForRepo(repoName, () => ({ activeBrowserPageIndex: Math.max(0, activeBrowserPageIndex - 1) }));
    }
  };

  const browserIframeRef = React.useRef<HTMLIFrameElement>(null);
  const browserViewPlaceholderRef = React.useRef<HTMLDivElement>(null);
  const lastRestoredRepoRef = React.useRef<string | null>(null);

  const setIframeUrlLocal = React.useCallback((url: string) => {
    setProjectStateForRepo(repoName, () => ({ iframeUrl: url }));
  }, [repoName, setProjectStateForRepo]);

  const setElectronLoadedUrlLocal = React.useCallback((url: string) => {
    setProjectStateForRepo(repoName, () => ({ electronLoadedUrl: url }));
  }, [repoName, setProjectStateForRepo]);

  const setIsIframeInsecureLocal = React.useCallback((isInsecure: boolean) => {
    setProjectStateForRepo(repoName, () => ({ isIframeInsecure: isInsecure }));
  }, [repoName, setProjectStateForRepo]);

  const setScreenshotLocal = React.useCallback((sc: string | null) => {
    setProjectStateForRepo(repoName, () => ({ screenshot: sc }));
  }, [repoName, setProjectStateForRepo]);

  const setIsScreenshotModeLocal = React.useCallback((isMode: boolean) => {
    setProjectStateForRepo(repoName, () => ({ isScreenshotMode: isMode }));
  }, [repoName, setProjectStateForRepo]);

  const setAnnotationsLocal = React.useCallback((ann: any) => {
    setProjectStateForRepo(repoName, (prev) => ({ annotations: typeof ann === "function" ? ann(prev.annotations) : ann }));
  }, [repoName, setProjectStateForRepo]);

  const setSelectedAnnotationIdLocal = React.useCallback((id: number | null) => {
    setProjectStateForRepo(repoName, () => ({ selectedAnnotationId: id }));
  }, [repoName, setProjectStateForRepo]);

  const setSelectedToolLocal = React.useCallback((tool: any) => {
    setProjectStateForRepo(repoName, () => ({ selectedTool: tool }));
  }, [repoName, setProjectStateForRepo]);

  const [screenshotDisplaySize, setScreenshotDisplaySize] = React.useState<{ width: number; height: number } | null>(null);

  const requestEmbeddedCapture = React.useCallback(async () => {
    if (window.electronAPI?.browserView && isSelected) {
      return window.electronAPI.browserView.capture();
    }
    return null;
  }, [isSelected]);

  // Sync with current Electron URL on mount
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    const sync = async () => {
      const url = await window.electronAPI!.browserView.getUrl();
      if (url && url !== "about:blank") {
        setProjectStateForRepo(repoName, (prev) => ({ 
          electronLoadedUrl: url,
          iframeUrl: prev.iframeUrl || url 
        }));
      }
    };
    sync();
  }, [isElectron, isSelected, repoName, setProjectStateForRepo]);

  // Restore or set initial URL when mounting or switching repo
  React.useEffect(() => {
    if (!isSelected) return;

    const repoChanged = repoName !== lastRestoredRepoRef.current;
    lastRestoredRepoRef.current = repoName;

    const sessionUrl = browserPagesCurrentUrls[activeBrowserPageIndex];
    const targetUrl = sessionUrl || browserPages[activeBrowserPageIndex] || "";

    if (targetUrl && targetUrl !== iframeUrl) {
      setIframeUrlLocal(targetUrl);
    }
  }, [isSelected, repoName, browserPages, activeBrowserPageIndex, browserPagesCurrentUrls, setIframeUrlLocal, iframeUrl]);

  // Save current URL to session URLs whenever it changes
  React.useEffect(() => {
    if (isSelected && iframeUrl) {
      setProjectStateForRepo(repoName, (prev) => {
        const nextUrls = [...prev.browserPagesCurrentUrls];
        // Ensure array is large enough
        while (nextUrls.length < browserPages.length) {
          nextUrls.push("");
        }
        if (nextUrls[activeBrowserPageIndex] !== iframeUrl) {
          nextUrls[activeBrowserPageIndex] = iframeUrl;
          return { browserPagesCurrentUrls: nextUrls };
        }
        return prev;
      });
      // Still keep preservedIframeUrls for backward compatibility or global tracking
      preservedIframeUrls[repoName] = iframeUrl;
    }
  }, [isSelected, repoName, iframeUrl, activeBrowserPageIndex, browserPages.length, setProjectStateForRepo, preservedIframeUrls]);

  // Sync WebContentsView bounds with placeholder div
  React.useEffect(() => {
    if (
      !isElectron ||
      !isSelected ||
      !browserViewPlaceholderRef.current
    )
      return;

    const el = browserViewPlaceholderRef.current;
    const api = window.electronAPI!.browserView;

    const syncBounds = () => {
      const rect = el.getBoundingClientRect();
      api.setBounds({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    const ro = new ResizeObserver(syncBounds);
    ro.observe(el);
    window.addEventListener("resize", syncBounds);
    syncBounds();

    // Show on mount, hide on unmount
    api.show();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncBounds);
      api.hide();
    };
  }, [isElectron, isSelected]);

  // Load URL in the Electron WebContentsView when iframeUrl changes
  React.useEffect(() => {
    if (!isElectron || !isSelected || !iframeUrl) return;
    if (iframeUrl === electronLoadedUrl) return;
    setElectronLoadedUrlLocal(iframeUrl);
    window.electronAPI!.browserView.loadUrl(iframeUrl);
  }, [isElectron, isSelected, iframeUrl, electronLoadedUrl, setElectronLoadedUrlLocal]);

  // Listen for navigation events from WebContentsView
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    const api = window.electronAPI!.browserView;
    const unsubNav = api.onNavigated((url, isInsecure) => {
      setProjectStateForRepo(repoName, () => ({
        electronLoadedUrl: url,
        iframeUrl: url,
        isIframeInsecure: !!isInsecure
      }));
    });

    const unsubFail = api.onLoadFailed((url, desc, code) => {
      toast({
        title: "Load Failed",
        description: `${desc} (${code}) for ${url}`,
        variant: "destructive",
      });
    });

    return () => {
      unsubNav();
      unsubFail();
    };
  }, [isElectron, isSelected, repoName, setProjectStateForRepo]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const val = e.currentTarget.value;
        if (isElectron) {
          window.electronAPI!.browserView.loadUrl(val);
        } else {
          setIframeUrlLocal("");
          setTimeout(() => setIframeUrlLocal(val), 0);
        }
      }
    },
    [isElectron, setIframeUrlLocal],
  );

  return (
    <div className="flex flex-1 overflow-hidden" id="browser-view-main">
      {/* Left Narrow Sidebar */}
      <div className="w-12 border-r border-border bg-secondary/20 flex flex-col items-center py-4 gap-4">
        {browserPages.map((url, idx) => (
          <div key={idx} className="relative group">
            <button 
              onClick={() => {
                const targetUrl = browserPagesCurrentUrls[idx] || url;
                setProjectStateForRepo(repoName, () => ({ 
                  activeBrowserPageIndex: idx,
                  iframeUrl: targetUrl
                }));
              }}
              className={`p-2 rounded-lg transition-colors ${activeBrowserPageIndex === idx ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-accent"}`}
              title={idx === 0 ? "Project Page" : url}
            >
              <Globe className="w-5 h-5" />
            </button>
            {idx > 0 && (
              <button
                onClick={(e) => handleRemovePage(e, idx)}
                className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}

        <button 
          onClick={handleAddPage}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          title="Add Page"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex flex-1 bg-background overflow-hidden relative flex-col border-r border-border"
        id="browser-container"
      >
        {!screenshot ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
              <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded px-3 py-1 group">
                {isIframeInsecure ? (
                  <div title="Insecure connection (Certificate Error)">
                    <ShieldAlert className="w-3 h-3 text-destructive" />
                  </div>
                ) : (
                  <Globe className="w-3 h-3 text-muted-foreground" />
                )}
                <input
                  type="text"
                  value={iframeUrl}
                  onChange={(e) => setIframeUrlLocal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground focus:text-foreground transition-colors"
                  placeholder="Enter URL..."
                />
              </div>
            </div>
            {isElectron ? (
              <div ref={browserViewPlaceholderRef} className="flex-1 w-full bg-white">
                {!iframeUrl && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Enter a URL to preview the application
                  </div>
                )}
              </div>
            ) : (
              browserPages.map((pageUrl, idx) => {
                const currentUrl = browserPagesCurrentUrls[idx] || pageUrl;
                const effectiveUrl = activeBrowserPageIndex === idx ? iframeUrl : currentUrl;
                
                return (
                  <div key={idx} className={activeBrowserPageIndex === idx ? "flex-1 flex flex-col" : "hidden"}>
                    {effectiveUrl ? (
                      <iframe
                        src={effectiveUrl}
                        ref={activeBrowserPageIndex === idx ? browserIframeRef : undefined}
                        className="flex-1 w-full border-none bg-white"
                        title={`App Browser ${idx}`}
                        allow="camera; microphone; display-capture"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Enter a URL to preview the application
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          <ScreenshotViewer
            screenshot={screenshot}
            annotations={annotations}
            onAnnotationsChange={setAnnotationsLocal}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationIdLocal}
            onClose={() => {
              setScreenshotLocal(null);
              setIsScreenshotModeLocal(false);
              setScreenshotDisplaySize(null);
            }}
            selectedTool={selectedTool}
            onToolSelect={setSelectedToolLocal}
            onDisplaySizeChange={setScreenshotDisplaySize}
          />
        )}
      </div>
      {!isElectron && <IframeCaptureInjector iframeRef={browserIframeRef} />}
      <BrowserRightPanel
        repo={selectedRepo || ""}
        onRequestCapture={requestEmbeddedCapture}
        projectPath={
          selectedRepo
            ? repositories.find((r) => r.name === selectedRepo)?.path
            : undefined
        }
        iframeRef={isElectron ? undefined : browserIframeRef}
        electronBrowserView={
          isElectron ? window.electronAPI!.browserView : undefined
        }
        isScreenshotMode={isScreenshotMode}
        onScreenshotModeChange={setIsScreenshotModeLocal}
        screenshot={screenshot}
        onScreenshotChange={setScreenshotLocal}
        annotations={annotations}
        onAnnotationsChange={setAnnotationsLocal}
        selectedAnnotationId={selectedAnnotationId}
        onSelectAnnotation={setSelectedAnnotationIdLocal}
        selectedTool={selectedTool}
        onToolSelect={setSelectedToolLocal}
        onTaskCreated={() => {}}
        screenshotDisplaySize={screenshotDisplaySize}
      />
    </div>
  );
}