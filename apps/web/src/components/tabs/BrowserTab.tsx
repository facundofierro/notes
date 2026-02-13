import * as React from "react";
import { Globe, ShieldAlert, Plus, X, RotateCw } from "lucide-react";
import { BrowserRightPanel } from "@/components/features/browser/BrowserRightPanel";
import { IframeCaptureInjector } from "@/components/features/browser/capture/IframeCaptureInjector";
import { ScreenshotViewer } from "@/components/features/browser/capture/ScreenshotViewer";
import { useHomeStore, ProjectState } from "@/store/useHomeStore";
import { toast } from "@agelum/shadcn";
import { ImageWithFallback } from "@/components/shared/ImageWithFallback";


export function BrowserTab({ repoName }: { repoName: string }) {
  const isElectron = useHomeStore((s) => s.isElectron);
  const isGlobalOverlayOpen = useHomeStore((s) => s.isGlobalOverlayOpen);
  const selectedRepo = useHomeStore((s) => s.selectedRepo);
  const repositories = useHomeStore((s) => s.repositories);
  const settings = useHomeStore((s) => s.settings);
  const projectState =
    useHomeStore((s) => s.projectStates[repoName]) ||
    useHomeStore.getState().getProjectState();
  const setProjectStateForRepo = useHomeStore((s) => s.setProjectStateForRepo);
  const saveProjectConfig = useHomeStore((s) => s.saveProjectConfig);

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
    browserPagesFavicons = [],
    viewMode,
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
    const repo = repositories.find((r) => r.name === repoName);
    if (repo?.path) {
      if (!projectConfig) {
        fetch(`/api/project/config?path=${encodeURIComponent(repo.path)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.config) {
              setProjectStateForRepo(repoName, () => ({
                projectConfig: data.config,
              }));
            }
          })
          .catch((e) => console.error("Failed to load project config", e));
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

  // Load cached favicons on mount
  React.useEffect(() => {
    const repo = repositories.find((r) => r.name === repoName);
    if (repo?.path) {
      if (
        (!browserPagesFavicons || browserPagesFavicons.length === 0) &&
        browserPages.length > 0
      ) {
        fetch(
          `/api/project/cache/favicons?path=${encodeURIComponent(repo.path)}`,
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.favicons && Array.isArray(data.favicons)) {
              setProjectStateForRepo(repoName, () => ({
                browserPagesFavicons: data.favicons,
              }));
            }
          })
          .catch((e) => console.error("Failed to load favicon cache", e));
      }
    }
  }, [
    repoName,
    repositories,
    browserPagesFavicons,
    browserPages.length,
    setProjectStateForRepo,
  ]);

  // Save cached favicons Debounced
  React.useEffect(() => {
    const repo = repositories.find((r) => r.name === repoName);
    if (
      !repo?.path ||
      !browserPagesFavicons ||
      browserPagesFavicons.length === 0
    )
      return;

    const timeoutId = setTimeout(() => {
      fetch("/api/project/cache/favicons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: repo.path,
          favicons: browserPagesFavicons,
        }),
      }).catch((e) => console.error("Failed to save favicon cache", e));
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [browserPagesFavicons, repoName, repositories]);

  const handleAddPage = async () => {
    const existingPages = currentProjectConfig?.browserPages || [];
    const newPages = [...existingPages, ""];
    await saveProjectConfig({ browserPages: newPages });
    setProjectStateForRepo(repoName, () => ({
      activeBrowserPageIndex: newPages.length,
    }));
  };

  const updateConfigUrl = React.useCallback(
    async (url: string) => {
      if (activeBrowserPageIndex === 0) return;

      const configIndex = activeBrowserPageIndex - 1;
      const existingPages = currentProjectConfig?.browserPages || [];

      if (existingPages[configIndex] === url) return;

      const newPages = [...existingPages];
      while (newPages.length <= configIndex) newPages.push("");

      newPages[configIndex] = url;
      await saveProjectConfig({ browserPages: newPages });
    },
    [activeBrowserPageIndex, currentProjectConfig, saveProjectConfig],
  );

  const handleRemovePage = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === 0) return;

    // Destroy the Electron view for this tab
    if (isElectron && window.electronAPI?.browserView) {
      window.electronAPI.browserView.destroy(index);
    }

    const existingPages = currentProjectConfig?.browserPages || [];
    const newPages = existingPages.filter((_, i) => i !== index - 1);
    await saveProjectConfig({ browserPages: newPages });

    setProjectStateForRepo(repoName, (prev) => {
      const nextUrls = [...(prev.browserPagesCurrentUrls || [])];
      if (index < nextUrls.length) nextUrls.splice(index, 1);

      const nextFavicons = [...(prev.browserPagesFavicons || [])];
      if (index < nextFavicons.length) nextFavicons.splice(index, 1);

      return {
        activeBrowserPageIndex: Math.max(
          0,
          activeBrowserPageIndex >= index
            ? activeBrowserPageIndex - 1
            : activeBrowserPageIndex,
        ),
        browserPagesCurrentUrls: nextUrls,
        browserPagesFavicons: nextFavicons,
      };
    });
  };

  const browserIframeRef = React.useRef<HTMLIFrameElement>(null);
  // One placeholder ref per tab for Electron WebContentsView bounds syncing
  const browserViewPlaceholderRefs = React.useRef<Map<number, HTMLDivElement>>(
    new Map(),
  );

  const setPlaceholderRef = React.useCallback(
    (idx: number, el: HTMLDivElement | null) => {
      if (el) {
        browserViewPlaceholderRefs.current.set(idx, el);
      } else {
        browserViewPlaceholderRefs.current.delete(idx);
      }
    },
    [],
  );

  const setIframeUrlLocal = React.useCallback(
    (url: string) => {
      setProjectStateForRepo(repoName, () => ({ iframeUrl: url }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setElectronLoadedUrlLocal = React.useCallback(
    (url: string) => {
      setProjectStateForRepo(repoName, () => ({ electronLoadedUrl: url }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setIsIframeInsecureLocal = React.useCallback(
    (isInsecure: boolean) => {
      setProjectStateForRepo(repoName, () => ({
        isIframeInsecure: isInsecure,
      }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setScreenshotLocal = React.useCallback(
    (sc: string | null) => {
      setProjectStateForRepo(repoName, () => ({ screenshot: sc }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setIsScreenshotModeLocal = React.useCallback(
    (isMode: boolean) => {
      setProjectStateForRepo(repoName, () => ({ isScreenshotMode: isMode }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setAnnotationsLocal = React.useCallback(
    (ann: any) => {
      setProjectStateForRepo(repoName, (prev) => ({
        annotations: typeof ann === "function" ? ann(prev.annotations) : ann,
      }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setSelectedAnnotationIdLocal = React.useCallback(
    (id: number | null) => {
      setProjectStateForRepo(repoName, () => ({ selectedAnnotationId: id }));
    },
    [repoName, setProjectStateForRepo],
  );

  const setSelectedToolLocal = React.useCallback(
    (tool: any) => {
      setProjectStateForRepo(repoName, () => ({ selectedTool: tool }));
    },
    [repoName, setProjectStateForRepo],
  );

  const [screenshotDisplaySize, setScreenshotDisplaySize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  // Load a URL in the Electron WebContentsView for a given tab index.
  const loadInElectron = React.useCallback(
    (url: string, tabIndex: number = 0) => {
      if (!isElectron) return;

      setProjectStateForRepo(repoName, (prev) => {
        const newLog = {
          requestId: `browser-nav-${Date.now()}`,
          method: "BROWSER",
          url: url || "(empty url)",
          timestamp: Date.now(),
          finished: true,
          type: "navigation",
          status: url ? 200 : 0,
        };
        const logs = [...prev.networkLogs, newLog].slice(-100);
        return {
          networkLogs: logs,
          ...(url ? { electronLoadedUrl: url } : {}),
        };
      });

      if (url) {
        window.electronAPI!.browserView.loadUrl(url, tabIndex);
      }
    },
    [isElectron, repoName, setProjectStateForRepo],
  );

  // Track which tabs have been initially loaded
  const initialLoadDoneForTab = React.useRef<Set<number>>(new Set());

  const requestEmbeddedCapture = React.useCallback(async () => {
    if (window.electronAPI?.browserView && isSelected) {
      return window.electronAPI.browserView.capture(activeBrowserPageIndex);
    }
    return null;
  }, [isSelected, activeBrowserPageIndex]);

  // Sync with current Electron URL on mount (for the active tab)
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    let cancelled = false;
    (async () => {
      const url = await window.electronAPI!.browserView.getUrl(
        activeBrowserPageIndex,
      );
      if (!cancelled && url && url !== "about:blank") {
        setProjectStateForRepo(repoName, (prev) => {
          if (prev.iframeUrl) return { electronLoadedUrl: url };
          return { electronLoadedUrl: url, iframeUrl: url };
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isElectron,
    isSelected,
    repoName,
    activeBrowserPageIndex,
    setProjectStateForRepo,
  ]);

  // Load initial URL only if nothing is loaded yet
  React.useEffect(() => {
    if (!isSelected) return;
    setProjectStateForRepo(repoName, (prev) => {
      if (prev.iframeUrl) return {};
      const mainUrl = currentProjectConfig?.url || "";
      const targetUrl = mainUrl || browserPages[activeBrowserPageIndex] || "";
      if (!targetUrl) return {};
      return { iframeUrl: targetUrl };
    });
  }, [
    isSelected,
    repoName,
    browserPages,
    activeBrowserPageIndex,
    currentProjectConfig,
    setProjectStateForRepo,
  ]);

  // Persist navigated URL to session
  React.useEffect(() => {
    if (!isSelected || !iframeUrl) return;
    setProjectStateForRepo(repoName, (prev) => {
      const nextUrls = [...(prev.browserPagesCurrentUrls || [])];
      while (nextUrls.length < browserPages.length) nextUrls.push("");
      if (nextUrls[activeBrowserPageIndex] === iframeUrl) return {};
      nextUrls[activeBrowserPageIndex] = iframeUrl;
      return { browserPagesCurrentUrls: nextUrls };
    });
  }, [
    isSelected,
    repoName,
    iframeUrl,
    activeBrowserPageIndex,
    browserPages.length,
    setProjectStateForRepo,
  ]);

  const isBrowserVisible =
    isSelected && viewMode === "browser" && !isGlobalOverlayOpen;

  // Sync WebContentsView bounds for the ACTIVE tab's placeholder
  React.useEffect(() => {
    if (!isElectron || !isBrowserVisible) return;

    const el = browserViewPlaceholderRefs.current.get(activeBrowserPageIndex);
    if (!el) return;

    const api = window.electronAPI!.browserView;

    const syncBounds = () => {
      const rect = el.getBoundingClientRect();
      api.setBounds(
        {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        activeBrowserPageIndex,
      );
    };

    const ro = new ResizeObserver(syncBounds);
    ro.observe(el);
    window.addEventListener("resize", syncBounds);
    syncBounds();

    // Show the active tab's view, hide all others
    api.show(activeBrowserPageIndex);
    browserPages.forEach((_, idx) => {
      if (idx !== activeBrowserPageIndex) {
        api.hide(idx);
      }
    });

    // Load page if not loaded yet for this tab
    if (!initialLoadDoneForTab.current.has(activeBrowserPageIndex)) {
      const targetUrl =
        iframeUrl ||
        browserPagesCurrentUrls[activeBrowserPageIndex] ||
        browserPages[activeBrowserPageIndex] ||
        currentProjectConfig?.url ||
        "";
      if (targetUrl) {
        initialLoadDoneForTab.current.add(activeBrowserPageIndex);
        if (!iframeUrl) setIframeUrlLocal(targetUrl);
        loadInElectron(targetUrl, activeBrowserPageIndex);
      }
    }

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncBounds);
      api.hide(activeBrowserPageIndex);
    };
  }, [
    isElectron,
    isBrowserVisible,
    activeBrowserPageIndex,
    browserPages,
    browserPagesCurrentUrls,
    currentProjectConfig?.url,
    iframeUrl,
    loadInElectron,
    setIframeUrlLocal,
  ]);

  // Listen for navigation events from any WebContentsView tab
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    const api = window.electronAPI!.browserView;

    const unsubNav = api.onNavigated(
      (url: string, isInsecure?: boolean, tabIndex?: number) => {
        const navTabIndex = tabIndex ?? 0;
        // Only update the URL bar state if this event is from the active tab
        if (navTabIndex === activeBrowserPageIndex) {
          setProjectStateForRepo(repoName, (prev) => {
            if (
              prev.electronLoadedUrl === url &&
              prev.iframeUrl === url &&
              prev.isIframeInsecure === !!isInsecure
            ) {
              return prev;
            }
            return {
              electronLoadedUrl: url,
              iframeUrl: url,
              isIframeInsecure: !!isInsecure,
            };
          });
        }
        // Always persist the URL for the specific tab
        if (navTabIndex !== 0) {
          // Update config for non-main tabs
          const configIndex = navTabIndex - 1;
          const existingPages = currentProjectConfig?.browserPages || [];
          if (existingPages[configIndex] !== url) {
            const newPages = [...existingPages];
            while (newPages.length <= configIndex) newPages.push("");
            newPages[configIndex] = url;
            saveProjectConfig({ browserPages: newPages });
          }
        }
        // Persist to browserPagesCurrentUrls
        setProjectStateForRepo(repoName, (prev) => {
          const nextUrls = [...(prev.browserPagesCurrentUrls || [])];
          while (nextUrls.length <= navTabIndex) nextUrls.push("");
          if (nextUrls[navTabIndex] === url) return {};
          nextUrls[navTabIndex] = url;
          return { browserPagesCurrentUrls: nextUrls };
        });
      },
    );

    const unsubFail = api.onLoadFailed(
      (url: string, desc: string, code: number, tabIndex?: number) => {
        toast({
          title: "Load Failed",
          description: `${desc} (${code}) for ${url}`,
          variant: "destructive",
        });
      },
    );

    const unsubRequest = api.onNetworkRequest(
      (params: any, tabIndex?: number) => {
        // Only track network for active tab
        if ((tabIndex ?? 0) !== activeBrowserPageIndex) return;
        setProjectStateForRepo(repoName, (prev) => {
          const newLog = {
            requestId: params.requestId,
            method: params.request.method,
            url: params.request.url,
            timestamp: params.wallTime * 1000,
            finished: false,
          };
          const logs = [...prev.networkLogs, newLog].slice(-100);
          return { networkLogs: logs };
        });
      },
    );

    const unsubResponse = api.onNetworkResponse(
      (params: any, tabIndex?: number) => {
        if ((tabIndex ?? 0) !== activeBrowserPageIndex) return;
        setProjectStateForRepo(repoName, (prev) => ({
          networkLogs: prev.networkLogs.map((log) =>
            log.requestId === params.requestId
              ? {
                  ...log,
                  status: params.response.status,
                  type: params.type,
                  size: params.response.encodedDataLength,
                }
              : log,
          ),
        }));
      },
    );

    const unsubFinished = api.onNetworkFinished(
      (params: any, tabIndex?: number) => {
        if ((tabIndex ?? 0) !== activeBrowserPageIndex) return;
        setProjectStateForRepo(repoName, (prev) => ({
          networkLogs: prev.networkLogs.map((log) =>
            log.requestId === params.requestId
              ? { ...log, finished: true }
              : log,
          ),
        }));
      },
    );

    const unsubNetworkFail = api.onNetworkFailed(
      (params: any, tabIndex?: number) => {
        if ((tabIndex ?? 0) !== activeBrowserPageIndex) return;
        setProjectStateForRepo(repoName, (prev) => ({
          networkLogs: prev.networkLogs.map((log) =>
            log.requestId === params.requestId
              ? { ...log, finished: true, status: 0 }
              : log,
          ),
        }));
      },
    );

    return () => {
      unsubNav();
      unsubFail();
      unsubRequest();
      unsubResponse();
      unsubFinished();
      unsubNetworkFail();
    };
  }, [
    isElectron,
    isSelected,
    repoName,
    setProjectStateForRepo,
    activeBrowserPageIndex,
    currentProjectConfig,
    saveProjectConfig,
  ]);

  // Listen for favicon updates
  React.useEffect(() => {
    if (!isElectron || !isSelected) return;
    const api = window.electronAPI!.browserView;

    const unsubFavicon = api.onFaviconUpdated(
      (favicon: string, tabIndex?: number) => {
        const navTabIndex = tabIndex ?? 0;
        setProjectStateForRepo(repoName, (prev: ProjectState) => {
          const nextFavicons = [...(prev.browserPagesFavicons || [])];
          while (nextFavicons.length <= navTabIndex) nextFavicons.push("");
          if (nextFavicons[navTabIndex] === favicon) return {};
          nextFavicons[navTabIndex] = favicon;
          return { browserPagesFavicons: nextFavicons };
        });
      },
    );

    return () => {
      unsubFavicon();
    };
  }, [isElectron, isSelected, repoName, setProjectStateForRepo]);

  // Enter in URL bar reloads the page
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const val = e.currentTarget.value;
        let finalUrl = val.trim();

        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
        }

        if (isElectron) {
          setIframeUrlLocal(finalUrl);
          loadInElectron(finalUrl, activeBrowserPageIndex);
        } else {
          setIframeUrlLocal("");
          setTimeout(() => setIframeUrlLocal(finalUrl), 0);
        }
        updateConfigUrl(finalUrl);
      }
    },
    [
      isElectron,
      activeBrowserPageIndex,
      setIframeUrlLocal,
      loadInElectron,
      updateConfigUrl,
    ],
  );

  const handleRefresh = React.useCallback(() => {
    if (isElectron) {
      window.electronAPI!.browserView.reload(activeBrowserPageIndex);
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
    if (isElectron) {
      window.electronAPI!.openExternal(iframeUrl);
    } else {
      window.open(iframeUrl, "_blank");
    }
  }, [isElectron, iframeUrl]);

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
                  iframeUrl: targetUrl,
                }));
                // In Electron, the show/hide is handled by the bounds sync effect
              }}
              className={`p-2 rounded-lg transition-colors ${activeBrowserPageIndex === idx ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-accent"}`}
              title={idx === 0 ? "Project Page" : url}
            >
              <ImageWithFallback
                src={browserPagesFavicons[idx]}
                className="w-5 h-5 rounded-sm object-cover"
                fallback={<Globe className="w-5 h-5" />}
              />


            </button>
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
            {activeBrowserPageIndex > 0 && (
              <button
                onClick={(e) => handleRemovePage(e, activeBrowserPageIndex)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Close Page"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {browserPages.map((pageUrl, idx) => {
            const currentUrl = browserPagesCurrentUrls[idx] || pageUrl;
            const isActive = activeBrowserPageIndex === idx;

            // In Electron: render a placeholder div for ALL tabs.
            // Each tab gets its own WebContentsView managed by the main process.
            if (isElectron) {
              return (
                <div
                  key={idx}
                  ref={(el) => setPlaceholderRef(idx, el)}
                  className={isActive ? "flex-1 w-full bg-zinc-900" : "hidden"}
                >
                  {!currentUrl && isActive && (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Enter a URL to preview the application
                    </div>
                  )}
                </div>
              );
            }

            // Non-Electron: use iframes (unchanged behavior)
            return (
              <div
                key={idx}
                className={
                  isActive ? "flex-1 flex flex-col w-full h-full" : "hidden"
                }
              >
                {currentUrl ? (
                  <iframe
                    ref={isActive ? browserIframeRef : undefined}
                    src={isActive ? iframeUrl || currentUrl : currentUrl}
                    className="flex-1 w-full h-full border-none bg-zinc-900"
                    title={`Browser Page ${idx}`}
                    allow="camera; microphone; display-capture"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Enter a URL to browse
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
          currentUrl={iframeUrl || ""}
        />
      )}
    </div>
  );
}
