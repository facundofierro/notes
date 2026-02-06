import * as React from "react";
import { Globe, ShieldAlert } from "lucide-react";
import { BrowserRightPanel } from "@/components/BrowserRightPanel";
import { IframeCaptureInjector } from "@/components/IframeCaptureInjector";
import { HomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";
import { toast } from "@agelum/shadcn";

interface BrowserTabProps {
  state: HomeState;
  callbacks: ReturnType<typeof useHomeCallbacks>;
}

export function BrowserTab({
  state,
  callbacks,
}: BrowserTabProps) {
  const {
    iframeUrl,
    setIframeUrl,
    isIframeInsecure,
    setIsIframeInsecure,
    isElectron,
    isScreenshotMode,
    setIsScreenshotMode,
    selectedRepo,
    repositories,
    preservedIframeUrls,
    setPreservedIframeUrls,
    currentProjectConfig,
  } = state;
  const { browserIframeRef, requestEmbeddedCapture } = callbacks;

  const browserViewPlaceholderRef = React.useRef<HTMLDivElement>(null);
  const electronLoadedUrlRef = React.useRef<string>("");
  const lastRestoredRepoRef = React.useRef<string | null>(null);

  // Restore or set initial URL when mounting or switching repo
  React.useEffect(() => {
    if (!selectedRepo) return;

    const repoChanged = selectedRepo !== lastRestoredRepoRef.current;
    if (!repoChanged && iframeUrl) return; // Already loaded/restored

    lastRestoredRepoRef.current = selectedRepo;

    const preserved = preservedIframeUrls[selectedRepo];
    const targetUrl = preserved || currentProjectConfig?.url || "";

    if (targetUrl && targetUrl !== iframeUrl) {
      setIframeUrl(targetUrl);
    }
  }, [selectedRepo, currentProjectConfig?.url, preservedIframeUrls, setIframeUrl, iframeUrl]);

  // Save current URL to preservedUrls whenever it changes
  React.useEffect(() => {
    if (selectedRepo && iframeUrl) {
      setPreservedIframeUrls((prev) => {
        if (prev[selectedRepo] === iframeUrl) return prev;
        return { ...prev, [selectedRepo]: iframeUrl };
      });
    }
  }, [selectedRepo, iframeUrl, setPreservedIframeUrls]);

  // Sync WebContentsView bounds with placeholder div
  React.useEffect(() => {
    if (
      !isElectron ||
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
  }, [isElectron]);

  // Load URL in the Electron WebContentsView when iframeUrl changes
  React.useEffect(() => {
    if (!isElectron || !iframeUrl) return;
    if (iframeUrl === electronLoadedUrlRef.current) return;
    electronLoadedUrlRef.current = iframeUrl;
    window.electronAPI!.browserView.loadUrl(iframeUrl);
  }, [isElectron, iframeUrl]);

  // Listen for navigation events from WebContentsView
  React.useEffect(() => {
    if (!isElectron) return;
    const api = window.electronAPI!.browserView;
    const unsubNav = api.onNavigated((url, isInsecure) => {
      electronLoadedUrlRef.current = url;
      setIframeUrl(url);
      setIsIframeInsecure(!!isInsecure);
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
  }, [isElectron, setIframeUrl, setIsIframeInsecure]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const val = e.currentTarget.value;
        if (isElectron) {
          window.electronAPI!.browserView.loadUrl(val);
        } else {
          setIframeUrl("");
          setTimeout(() => setIframeUrl(val), 0);
        }
      }
    },
    [isElectron, setIframeUrl],
  );

  return (
    <div className="flex flex-1 overflow-hidden" id="browser-view-main">
      <div
        className="flex flex-1 bg-background overflow-hidden relative flex-col border-r border-border"
        id="browser-container"
        style={{
          display: isScreenshotMode ? "none" : "flex",
        }}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded px-3 py-1 group">
            {isIframeInsecure ? (
              <ShieldAlert className="w-3 h-3 text-destructive" title="Insecure connection (Certificate Error)" />
            ) : (
              <Globe className="w-3 h-3 text-muted-foreground" />
            )}
            <input
              type="text"
              value={iframeUrl}
              onChange={(e) => setIframeUrl(e.target.value)}
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
        onScreenshotModeChange={setIsScreenshotMode}
        onTaskCreated={() => {}}
      />
    </div>
  );
}
