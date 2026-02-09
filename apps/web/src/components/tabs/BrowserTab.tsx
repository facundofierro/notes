import * as React from "react";
import { Globe, ShieldAlert, Plus, X, RotateCw } from "lucide-react";
import { BrowserRightPanel } from "@/components/features/browser/BrowserRightPanel";
import { BrowserPage } from "@/components/tabs/BrowserPage";
import { IframeCaptureInjector } from "@/components/features/browser/capture/IframeCaptureInjector";
import { ScreenshotViewer } from "@/components/features/browser/capture/ScreenshotViewer";
import { useHomeStore } from "@/store/useHomeStore";
import { toast } from "@agelum/shadcn";

export function BrowserTab({ repoName }: { repoName: string }) {
  const isElectron = useHomeStore(s => s.isElectron);
  const selectedRepo = useHomeStore(s => s.selectedRepo);
  const repositories = useHomeStore(s => s.repositories);
  const settings = useHomeStore(s => s.settings);
  const projectState = useHomeStore(s => s.projectStates[repoName]) || useHomeStore.getState().getProjectState();
  const setProjectStateForRepo = useHomeStore(s => s.setProjectStateForRepo);
  const saveProjectConfig = useHomeStore(s => s.saveProjectConfig);

  const isSelected = selectedRepo === repoName;

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
    browserPagesCurrentUrls = [],
    viewMode,
    tempBrowserScreenshot,
  } = projectState;

  const currentProjectConfig = React.useMemo(() => {
    const settingsProj = settings.projects?.find((p) => p.name === repoName);
    if (!settingsProj && !projectConfig) return null;
    return {
      ...(settingsProj || {}),
      ...(projectConfig || {}),
    };
  }, [repoName, settings.projects, projectConfig]);

  // Load project config on mount if missing
  React.useEffect(() => {
    const repo = repositories.find(r => r.name === repoName);
    if (repo?.path) {
      if (!projectConfig) {
        fetch(`/api/project/config?path=${encodeURIComponent(repo.path)}`)
          .then(res => res.json())
          .then(data => {
            if (data.config) {
              setProjectStateForRepo(repoName, () => ({ projectConfig: data.config }));
            }
          })
          .catch(e => console.error("Failed to load project config", e));
      }
    }
  }, [repoName, repositories, projectConfig, setProjectStateForRepo]);

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
    const existingPages = currentProjectConfig?.browserPages || [];
    const newPages = [...existingPages, ""];
    await saveProjectConfig({ browserPages: newPages });
    // Index is 0 (main) + index of new page in browserPages array (which is length - 1)
    // So total items = 1 + newPages.length. Last index = newPages.length.
    setProjectStateForRepo(repoName, () => ({ activeBrowserPageIndex: newPages.length }));
  };

  const updateConfigUrl = React.useCallback(async (url: string) => {
    if (activeBrowserPageIndex === 0) return; // Don't update main URL
    
    // browserPages[0] is mainUrl. browserPages[1] is config.browserPages[0].
    // so index in config.browserPages is activeBrowserPageIndex - 1.
    const configIndex = activeBrowserPageIndex - 1;
    const existingPages = currentProjectConfig?.browserPages || [];
    
    // Only update if changed
    if (existingPages[configIndex] === url) return;
    
    // Avoid updating if the url is transient/empty and we don't want to clear it yet? 
    // Actually we do want to save whatever is "committed" (Enter or navigation).
    
    const newPages = [...existingPages];
    while (newPages.length <= configIndex) newPages.push("");
    
    newPages[configIndex] = url;
    await saveProjectConfig({ browserPages: newPages });
  }, [activeBrowserPageIndex, currentProjectConfig, saveProjectConfig]);

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

  // Explicit helper to load a URL in the Electron WebContentsView.
  // Only called from user-driven events (tab click, Enter key, page switch).
  const loadInElectron = React.useCallback((url: string) => {
    if (!isElectron) return;
    
    setProjectStateForRepo(repoName, (prev) => {
      const newLog = {
        requestId: `browser-nav-${Date.now()}`,
        method: "BROWSER",
        url: url || "(empty url)",
        timestamp: Date.now(),
        finished: true,
        type: "navigation",
        status: url ? 200 : 0
      };
      const logs = [...prev.networkLogs, newLog].slice(-100);
      return { 
        networkLogs: logs,
        ...(url ? { electronLoadedUrl: url } : {})
      };
    });

    if (url && activeBrowserPageIndex === 0) {
      window.electronAPI!.browserView.loadUrl(url);
    }
  }, [isElectron, repoName, setProjectStateForRepo, activeBrowserPageIndex]); 

  const initialLoadDoneRef = React.useRef(false);

  const requestEmbeddedCapture = React.useCallback(async () => {
    if (window.electronAPI?.browserView && isSelected) {
      return window.electronAPI.browserView.capture();
    }
    return null;
  }, [isSelected]);

  // Sync with current Electron URL on mount
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    let cancelled = false;
    (async () => {
      const url = await window.electronAPI!.browserView.getUrl();
      if (!cancelled && url && url !== "about:blank") {
        setProjectStateForRepo(repoName, (prev) => {
          if (prev.iframeUrl) return { electronLoadedUrl: url };
          return { electronLoadedUrl: url, iframeUrl: url };
        });
      }
    })();
    return () => { cancelled = true; };
  }, [isElectron, isSelected, repoName, setProjectStateForRepo]);

  // Load initial URL only if nothing is loaded yet
  React.useEffect(() => {
    if (!isSelected) return;
    setProjectStateForRepo(repoName, (prev) => {
      if (prev.iframeUrl) return {};
      const mainUrl = currentProjectConfig?.url || "";
      const targetUrl = mainUrl || (browserPages[activeBrowserPageIndex] || "");
      if (!targetUrl) return {};
      return { iframeUrl: targetUrl };
    });
  }, [isSelected, repoName, browserPages, activeBrowserPageIndex, currentProjectConfig, setProjectStateForRepo]);

  // Persist navigated URL to session (covers typing, Electron nav, etc.)
  React.useEffect(() => {
    if (!isSelected || !iframeUrl) return;
    setProjectStateForRepo(repoName, (prev) => {
      const nextUrls = [...(prev.browserPagesCurrentUrls || [])];
      while (nextUrls.length < browserPages.length) nextUrls.push("");
      if (nextUrls[activeBrowserPageIndex] === iframeUrl) return {};
      nextUrls[activeBrowserPageIndex] = iframeUrl;
      return { browserPagesCurrentUrls: nextUrls };
    });
  }, [isSelected, repoName, iframeUrl, activeBrowserPageIndex, browserPages.length, setProjectStateForRepo]);

  const isBrowserVisible = isSelected && viewMode === "browser";

  // Sync WebContentsView bounds with placeholder div
  React.useEffect(() => {
    if (
      !isElectron ||
      !isBrowserVisible ||
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

    // Event 1: When browser tab becomes visible, load page if not already loaded
    if (!initialLoadDoneRef.current) {
      const targetUrl = iframeUrl || currentProjectConfig?.url || "";
      if (targetUrl) {
        initialLoadDoneRef.current = true;
        if (!iframeUrl) setIframeUrlLocal(targetUrl);
        loadInElectron(targetUrl);
      }
    }

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncBounds);
      api.hide();
    };
  }, [isElectron, isBrowserVisible, activeBrowserPageIndex, currentProjectConfig?.url, iframeUrl, loadInElectron, setIframeUrlLocal]);

  // Listen for navigation events from WebContentsView
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    const api = window.electronAPI!.browserView;
    
    const unsubNav = api.onNavigated((url, isInsecure) => {
      // Only update state if we are on the main tab
      if (activeBrowserPageIndex !== 0) return;

      setProjectStateForRepo(repoName, (prev) => {
        if (prev.electronLoadedUrl === url && prev.iframeUrl === url && prev.isIframeInsecure === !!isInsecure) {
          return prev;
        }
        return {
          electronLoadedUrl: url,
          iframeUrl: url,
          isIframeInsecure: !!isInsecure
        };
      });
      // Persist URL to config
      updateConfigUrl(url);
    });

    const unsubFail = api.onLoadFailed((url, desc, code) => {
      toast({
        title: "Load Failed",
        description: `${desc} (${code}) for ${url}`,
        variant: "destructive",
      });
    });

    const unsubRequest = api.onNetworkRequest((params: any) => {
      setProjectStateForRepo(repoName, (prev) => {
        const newLog = {
          requestId: params.requestId,
          method: params.request.method,
          url: params.request.url,
          timestamp: params.wallTime * 1000,
          finished: false,
        };
        // Keep only last 100 logs
        const logs = [...prev.networkLogs, newLog].slice(-100);
        return { networkLogs: logs };
      });
    });

    const unsubResponse = api.onNetworkResponse((params: any) => {
      setProjectStateForRepo(repoName, (prev) => ({
        networkLogs: prev.networkLogs.map((log) =>
          log.requestId === params.requestId
            ? {
                ...log,
                status: params.response.status,
                type: params.type,
                size: params.response.encodedDataLength,
              }
            : log
        ),
      }));
    });

    const unsubFinished = api.onNetworkFinished((params: any) => {
      setProjectStateForRepo(repoName, (prev) => ({
        networkLogs: prev.networkLogs.map((log) =>
          log.requestId === params.requestId ? { ...log, finished: true } : log
        ),
      }));
    });

    const unsubNetworkFail = api.onNetworkFailed((params: any) => {
      setProjectStateForRepo(repoName, (prev) => ({
        networkLogs: prev.networkLogs.map((log) =>
          log.requestId === params.requestId ? { ...log, finished: true, status: 0 } : log
        ),
      }));
    });

    return () => {
      unsubNav();
      unsubFail();
      unsubRequest();
      unsubResponse();
      unsubFinished();
      unsubNetworkFail();
    };
  }, [isElectron, isSelected, repoName, setProjectStateForRepo, activeBrowserPageIndex]);

  // Event 2: Enter in URL bar always reloads the page
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const val = e.currentTarget.value;
        let finalUrl = val.trim();

        // If it doesn't start with http:// or https://, treat as search query for DuckDuckGo
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(finalUrl)}`;
        }

        if (isElectron && activeBrowserPageIndex === 0) {
          setIframeUrlLocal(finalUrl);
          loadInElectron(finalUrl);
        } else {
          setIframeUrlLocal("");
          setTimeout(() => setIframeUrlLocal(finalUrl), 0);
        }
        // Persist URL to config
        updateConfigUrl(finalUrl);
      }
    },
    [isElectron, activeBrowserPageIndex, setIframeUrlLocal, loadInElectron, updateConfigUrl],
  );

  const handleRefresh = React.useCallback(() => {
    if (isElectron && activeBrowserPageIndex === 0) {
      window.electronAPI!.browserView.reload();
    } else {
      const currentUrl = iframeUrl;
      setIframeUrlLocal("");
      setTimeout(() => {
        setIframeUrlLocal(currentUrl);
      }, 100);
    }
  }, [isElectron, activeBrowserPageIndex, iframeUrl, setIframeUrlLocal]);

  const handleOpenExternal = React.useCallback(() => {
    if (!iframeUrl) return;
    if (isElectron && activeBrowserPageIndex === 0) {
      window.electronAPI!.openExternal(iframeUrl);
    } else {
      window.open(iframeUrl, "_blank");
    }
  }, [isElectron, activeBrowserPageIndex, iframeUrl]);

  return (
    <div className="flex flex-1 overflow-hidden" id="browser-view-main">
      {/* Left Narrow Sidebar */}
      <div className="w-12 border-r border-border bg-secondary flex flex-col items-center py-4 gap-4 overflow-y-auto no-scrollbar">
        {browserPages.map((url, idx) => (
          <div key={idx} className="relative group">
            <button 
              onClick={() => {
                const targetUrl = browserPagesCurrentUrls[idx] || url;
                setProjectStateForRepo(repoName, () => ({ 
                  activeBrowserPageIndex: idx,
                  iframeUrl: targetUrl
                }));
                if (isElectron && idx === 0) loadInElectron(targetUrl);
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
      {/* Always render browser content to preserve iframe navigation state */}
        <div className={screenshot ? "hidden" : "contents"}>
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                  title="Refresh"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded px-3 py-1 group">
                <button 
                  onClick={handleOpenExternal}
                  className="hover:text-primary transition-colors focus:outline-none"
                  title="Open in external browser"
                >
                  {isIframeInsecure ? (
                    <div title="Insecure connection (Certificate Error)">
                      <ShieldAlert className="w-3 h-3 text-destructive" />
                    </div>
                  ) : (
                    <Globe className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                  )}
                </button>
                <input
                  type="text"
                  value={iframeUrl || ""}
                  onChange={(e) => setIframeUrlLocal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground focus:text-foreground transition-colors"
                  placeholder="Enter URL..."
                />
              </div>
            </div>
            {browserPages.map((pageUrl, idx) => {
              const currentUrl = browserPagesCurrentUrls[idx] || pageUrl;
              const effectiveUrl = currentUrl;
              const isActive = activeBrowserPageIndex === idx;

              // If it's the main tab (idx === 0) AND we are in Electron,
              // render the placeholder div for the specific BrowserView.
              if (idx === 0 && isElectron) {
                return (
                  <div 
                    key={idx} 
                    ref={isActive ? browserViewPlaceholderRef : undefined} 
                    className={isActive ? "flex-1 w-full bg-zinc-900" : "hidden"}
                  >
                    {!iframeUrl && (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Enter a URL to preview the application
                      </div>
                    )}
                  </div>
                );
              }

              // Otherwise (sub-tabs OR web mode), render standard iframe via BrowserPage
              return (
                <BrowserPage
                  key={idx}
                  url={effectiveUrl}
                  isActive={isActive}
                  onUrlChange={() => {}} 
                  isElectron={false} // Force iframe for secondary tabs even in Electron
                  iframeRef={isActive ? browserIframeRef : undefined}
                />
              );
            })}
        </div>
        {tempBrowserScreenshot && (
          <div className="absolute inset-0 z-10 bg-zinc-900">
            <img 
              src={tempBrowserScreenshot} 
              alt="Browser preview" 
              className="w-full h-full object-contain"
            />
          </div>
        )}
        {screenshot && (
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
      {activeBrowserPageIndex === 0 && (
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
      )}
    </div>
  );
}