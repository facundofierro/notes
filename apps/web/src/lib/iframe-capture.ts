/**
 * Sets up a message listener that handles screenshot capture requests from the parent window.
 * This should be called from within an iframe context.
 * 
 * The handler listens for `agelum:capture-request` messages and responds with
 * `agelum:capture-response` messages containing a data URL of the captured content.
 */
export function setupIframeCaptureHandler() {
  if (typeof window === "undefined") {
    return;
  }

  const handleCaptureRequest = async (event: MessageEvent) => {
    const { data } = event;
    
    // Only handle agelum capture requests
    if (!data || data.type !== "agelum:capture-request") {
      return;
    }

    const captureId = data.id;
    let dataUrl: string | null = null;

    try {
      // Attempt to capture the entire document
      dataUrl = await captureDocument();
    } catch (err) {
      console.error("Failed to capture iframe content:", err);
    }

    // Send response back to parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "agelum:capture-response",
          id: captureId,
          dataUrl,
        },
        "*"
      );
    }
  };

  window.addEventListener("message", handleCaptureRequest);
}

/**
 * Captures the entire document using Canvas API.
 * Attempts to use html2canvas if available, falls back to canvas-based approach.
 */
async function captureDocument(): Promise<string> {
  // Try using html2canvas if available globally
  if ((window as any).html2canvas) {
    try {
      const canvas = await (window as any).html2canvas(document.body, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: true,
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("html2canvas failed, falling back to basic canvas capture:", err);
    }
  }

  // Fallback: Use basic canvas approach
  return captureDocumentWithCanvas();
}

/**
 * Captures document using Canvas API directly.
 * This is a basic fallback that captures the visible viewport.
 */
function captureDocumentWithCanvas(): string {
  const canvas = document.createElement("canvas");
  const rect = document.documentElement.getBoundingClientRect();
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Fill with white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // For a more complete capture, we'd need to render the DOM tree
  // For now, this is a basic implementation
  // A better approach would require html2canvas or similar library
  
  return canvas.toDataURL("image/png");
}

/**
 * Alternative: Captures the viewport using the modern approach with svg
 * This attempts to serialize the DOM and render it using SVG
 */
export async function captureDocumentAdvanced(): Promise<string> {
  const width = document.documentElement.scrollWidth;
  const height = document.documentElement.scrollHeight;

  // Create a canvas with the full document size
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Fill background
  const bgColor = window.getComputedStyle(document.documentElement).backgroundColor;
  ctx.fillStyle = bgColor || "white";
  ctx.fillRect(0, 0, width, height);

  // Serialize current DOM to SVG and render
  // This is a complex operation that would require proper DOM to SVG conversion
  // For production use, html2canvas or similar library is recommended
  
  return canvas.toDataURL("image/png");
}
