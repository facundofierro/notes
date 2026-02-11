import * as React from "react";
import { useHomeStore } from "@/store/useHomeStore";

interface BrowserPageProps {
  url: string;
  isActive: boolean;
  onUrlChange: (url: string) => void;
  isElectron: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
}

export function BrowserPage({
  url,
  isActive,
  onUrlChange,
  isElectron,
  iframeRef,
}: BrowserPageProps) {
  // const iframeRef = React.useRef<HTMLIFrameElement>(null); // Removed internal ref
  const [currentSrc, setCurrentSrc] = React.useState(url);

  // Update src when url prop changes, but only if it's meaningful?
  // Actually, we want to allow internal navigation without resetting src constantly.
  // But if the user types a new URL in the bar, we want to navigate.

  React.useEffect(() => {
    if (url && url !== currentSrc) {
      setCurrentSrc(url);
    }
  }, [url]);

  // If we are in Electron, this component is just a placeholder logic controller
  // The actual view is external.
  if (isElectron) {
    return (
      <div
        className={isActive ? "flex-1 flex flex-col w-full h-full" : "hidden"}
      >
        {/* Placeholder for Electron BrowserView */}
        <div className="flex-1 bg-zinc-900 flex items-center justify-center text-muted-foreground/50">
          {isActive ? "Browser Active" : "Background Tab"}
        </div>
      </div>
    );
  }

  return (
    <div className={isActive ? "flex-1 flex flex-col w-full h-full" : "hidden"}>
      {currentSrc ? (
        <iframe
          ref={iframeRef}
          src={currentSrc}
          className="flex-1 w-full h-full border-none bg-zinc-900"
          title="Browser"
          allow="camera; microphone; display-capture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          onLoad={(e) => {
            // Optional: try to sync URL if possible (cross-origin restrictions apply)
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Enter a URL to browse
        </div>
      )}
    </div>
  );
}
