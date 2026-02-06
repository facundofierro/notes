import * as React from "react";
import { Globe, ShieldAlert } from "lucide-react";
import { BrowserRightPanel } from "@/components/BrowserRightPanel";
import { IframeCaptureInjector } from "@/components/IframeCaptureInjector";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { useHomeStore } from "@/store/useHomeStore";
import { toast } from "@agelum/shadcn";

export function BrowserTab({ repoName }: { repoName: string }) {
  const store = useHomeStore();
  const {
    isElectron,
    selectedRepo,
    repositories,
    preservedIframeUrls,
    settings,
    projectStates,
  } = store;

  const isSelected = selectedRepo === repoName;
  const projectState = projectStates[repoName] || store.getProjectState();

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
  } = projectState;

  const currentProjectConfig = React.useMemo(() => {
    return settings.projects?.find((p) => p.name === repoName) || projectConfig || null;
  }, [repoName, settings.projects, projectConfig]);

  const browserIframeRef = React.useRef<HTMLIFrameElement>(null);
  const browserViewPlaceholderRef = React.useRef<HTMLDivElement>(null);
  const lastRestoredRepoRef = React.useRef<string | null>(null);

  const setProjectStateLocal = React.useCallback((updater: (prev: any) => any) => {
    store.setProjectState((prev) => {
      // If we are currently the selected repo, we can just use the store's setProjectState
      // but wait, store.setProjectState already uses selectedRepo.
      // We need to be careful if we want to update state for a background repo.
      return updater(prev);
    });
  }, [store]);

  // Use a more specific setter that targets THIS repo
  const setThisProjectState = React.useCallback((updater: any) => {
    store.setProjectState((prev) => {
      if (selectedRepo === repoName) {
        return typeof updater === "function" ? updater(prev) : updater;
      }
      // If not selected, we technically shouldn't be here or shouldn't be updating,
      // but for consistency we might want to support it.
      // However, store.setProjectState is tied to selectedRepo.
      return prev; 
    });
  }, [store, selectedRepo, repoName]);

  const setIframeUrlLocal = React.useCallback((url: string) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ iframeUrl: url }));
  }, [store, selectedRepo, repoName]);

  const setElectronLoadedUrlLocal = React.useCallback((url: string) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ electronLoadedUrl: url }));
  }, [store, selectedRepo, repoName]);

  const setIsIframeInsecureLocal = React.useCallback((isInsecure: boolean) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ isIframeInsecure: isInsecure }));
  }, [store, selectedRepo, repoName]);

  const setScreenshotLocal = React.useCallback((sc: string | null) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ screenshot: sc }));
  }, [store, selectedRepo, repoName]);

  const setIsScreenshotModeLocal = React.useCallback((isMode: boolean) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ isScreenshotMode: isMode }));
  }, [store, selectedRepo, repoName]);

  const setAnnotationsLocal = React.useCallback((ann: any) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState((prev) => ({ annotations: typeof ann === "function" ? ann(prev.annotations) : ann }));
  }, [store, selectedRepo, repoName]);

  const setSelectedAnnotationIdLocal = React.useCallback((id: number | null) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ selectedAnnotationId: id }));
  }, [store, selectedRepo, repoName]);

  const setSelectedToolLocal = React.useCallback((tool: any) => {
    if (selectedRepo !== repoName) return;
    store.setProjectState(() => ({ selectedTool: tool }));
  }, [store, selectedRepo, repoName]);

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
        store.setProjectState((prev) => ({ 
          electronLoadedUrl: url,
          iframeUrl: prev.iframeUrl || url 
        }));
      }
    };
    sync();
  }, [isElectron, isSelected, store]);

  // Restore or set initial URL when mounting or switching repo
  React.useEffect(() => {
    if (!isSelected) return;

    const repoChanged = repoName !== lastRestoredRepoRef.current;
    if (!repoChanged && iframeUrl) return; // Already loaded/restored

    lastRestoredRepoRef.current = repoName;

    const preserved = preservedIframeUrls[repoName];
    const targetUrl = preserved || currentProjectConfig?.url || "";

    if (targetUrl && targetUrl !== iframeUrl) {
      setIframeUrlLocal(targetUrl);
    }
  }, [isSelected, repoName, currentProjectConfig?.url, preservedIframeUrls, setIframeUrlLocal, iframeUrl]);

  // Save current URL to preservedUrls whenever it changes
  React.useEffect(() => {
    if (isSelected && iframeUrl) {
      store.preservedIframeUrls[repoName] = iframeUrl; // Using the store ref to avoid direct state change for this background record
    }
  }, [isSelected, repoName, iframeUrl, store.preservedIframeUrls]);

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
      store.setProjectState(() => ({
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
  }, [isElectron, isSelected, store]);

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
            ) : iframeUrl ? (
              <iframe
                src={iframeUrl}
                ref={browserIframeRef}
                className="flex-1 w-full border-none bg-white"
                title="App Browser"
                allow="camera; microphone; display-capture"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Enter a URL to preview the application
              </div>
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