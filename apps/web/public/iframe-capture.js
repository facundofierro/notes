/**
 * Iframe Screenshot Capture Script
 * This script is injected into iframes to handle capture requests from the parent window.
 * 
 * It listens for `agelum:capture-request` messages and responds with `agelum:capture-response`
 * messages containing a data URL screenshot.
 */

(function setupIframeCaptureHandler() {
  if (typeof window === "undefined") {
    return;
  }

  const handleCaptureRequest = async function(event) {
    const data = event.data;
    
    // Only handle agelum capture requests
    if (!data || data.type !== "agelum:capture-request") {
      return;
    }

    const captureId = data.id;
    let dataUrl = null;

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
          dataUrl: dataUrl,
        },
        "*"
      );
    }
  };

  window.addEventListener("message", handleCaptureRequest);

  /**
   * Captures the entire document using Canvas API.
   * Attempts to use html2canvas if available, falls back to viewport capture.
   */
  async function captureDocument() {
    // Try using html2canvas if available globally
    if (window.html2canvas) {
      try {
        const canvas = await window.html2canvas(document.body, {
          backgroundColor: null,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        return canvas.toDataURL("image/png");
      } catch (err) {
        console.warn("html2canvas failed, falling back to viewport capture:", err);
      }
    }

    // Fallback: Capture visible viewport
    return captureViewport();
  }

  /**
   * Captures the visible viewport using Canvas API.
   */
  function captureViewport() {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Get background color from document element
    const bgColor = window.getComputedStyle(document.documentElement).backgroundColor;
    ctx.fillStyle = bgColor || "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If html2canvas is not available, at least capture some basic info
    ctx.fillStyle = "#666";
    ctx.font = "14px sans-serif";
    ctx.fillText("Note: Use html2canvas for better results", 10, 30);
    ctx.fillText("Window size: " + window.innerWidth + "x" + window.innerHeight, 10, 50);
    
    return canvas.toDataURL("image/png");
  }
})();
