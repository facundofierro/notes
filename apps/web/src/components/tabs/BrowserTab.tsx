import * as React from "react";
import { Globe } from "lucide-react";
import { BrowserRightPanel } from "@/components/BrowserRightPanel";
import { IframeCaptureInjector } from "@/components/IframeCaptureInjector";
import { HomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";

interface BrowserTabProps {
  state: HomeState;
  callbacks: ReturnType<typeof useHomeCallbacks>;
  browserViewPlaceholderRef: React.RefObject<HTMLDivElement>;
}

export function BrowserTab({
  state,
  callbacks,
  browserViewPlaceholderRef,
}: BrowserTabProps) {
  const {
    iframeUrl,
    setIframeUrl,
    isElectron,
    isScreenshotMode,
    setIsScreenshotMode,
    selectedRepo,
    repositories,
  } = state;
  const { browserIframeRef, requestEmbeddedCapture } = callbacks;

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
            <Globe className="w-3 h-3 text-muted-foreground" />
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
