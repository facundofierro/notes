import React, { useEffect } from "react";

interface IframeCaptureInjectorProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

/**
 * Component that injects a capture handler script into an iframe.
 * This allows the parent window to request screenshots of the iframe content.
 */
export function IframeCaptureInjector({
  iframeRef,
}: IframeCaptureInjectorProps) {
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;

    // Inject the capture script when the iframe loads
    const handleIframeLoad = () => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        // Check if script is already injected
        if (iframeDoc.getElementById("agelum-capture-script")) {
          return;
        }

        // Create and inject script element
        const script = iframeDoc.createElement("script");
        script.id = "agelum-capture-script";
        script.type = "text/javascript";

        // Inline the capture handler code and element picker
        script.textContent = `
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

  // Element picker handler
  const handlePickRequest = function(event) {
    const data = event.data;
    
    if (!data || data.type !== "agelum:pick-request") {
      return;
    }

    let isPickingMode = false;
    const originalCursor = document.body.style.cursor;

    isPickingMode = true;
    document.body.style.cursor = "crosshair";

    const handleElementClick = function(e) {
      if (!isPickingMode) return;
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const element = e.target;
      if (!element) return;

      const selector = getElementSelector(element);
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent || "";
      const textSnippet = textContent.slice(0, 50).trim().replace(/\s+/g, " ");

      // Send back to parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "agelum:pick-response",
            id: data.id,
            element: {
              selector,
              tagName,
              textSnippet,
            },
          },
          "*"
        );
      }

      // Clean up
      isPickingMode = false;
      document.body.style.cursor = originalCursor;
      document.removeEventListener("click", handleElementClick, true);
      document.removeEventListener("keydown", handleCancel, true);
      
      return false;
    };

    const handleCancel = function(e) {
      if (e.key === "Escape") {
        isPickingMode = false;
        document.body.style.cursor = originalCursor;
        document.removeEventListener("click", handleElementClick, true);
        document.removeEventListener("keydown", handleCancel, true);

        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "agelum:pick-cancel",
              id: data.id,
            },
            "*"
          );
        }
      }
    };

    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleCancel, true);
  };

  // Coordinate-based element picker (used by parent overlay)
  const handlePickAtPoint = function(event) {
    const data = event.data;
    if (!data || data.type !== "agelum:pick-at-point") return;
    const el = document.elementFromPoint(data.x, data.y);
    if (el && window.parent && window.parent !== window) {
      const selector = getElementSelector(el);
      const tagName = el.tagName.toLowerCase();
      const textContent = el.textContent || "";
      const textSnippet = textContent.slice(0, 50).trim().replace(/\s+/g, " ");
      window.parent.postMessage({
        type: "agelum:pick-response",
        id: data.id,
        element: { selector, tagName, textSnippet },
      }, "*");
    }
  };

  window.addEventListener("message", handleCaptureRequest);
  window.addEventListener("message", handlePickRequest);
  window.addEventListener("message", handlePickAtPoint);

  /**
   * Generates a CSS selector for an element
   */
  function getElementSelector(element) {
    const testId = element.getAttribute("data-testid") || 
                   element.getAttribute("data-test") || 
                   element.getAttribute("data-qa");
    if (testId) return '[data-testid="' + testId + '"]';

    if (element.id) return '#' + element.id;

    const classList = Array.from(element.classList || []);
    if (classList.length > 0) {
      return "." + classList
        .slice(0, 2)
        .map((name) => name.trim())
        .filter(Boolean)
        .join(".");
    }

    const tag = element.tagName.toLowerCase();
    const parent = element.parentElement;
    if (!parent) return tag;

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === element.tagName
    );
    if (siblings.length <= 1) return tag;

    const index = Array.from(siblings).indexOf(element) + 1;
    return tag + ":nth-of-type(" + index + ")";
  }

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
    ctx.fillText("Note: Install html2canvas for full page capture", 10, 30);
    ctx.fillText("Window size: " + window.innerWidth + "x" + window.innerHeight, 10, 50);
    
    return canvas.toDataURL("image/png");
  }
})();
`;

        iframeDoc.head.appendChild(script);
      } catch (err) {
        console.warn("Failed to inject capture handler into iframe:", err);
      }
    };

    iframe.addEventListener("load", handleIframeLoad);

    // Try to inject immediately if already loaded
    try {
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc && iframeDoc.readyState === "complete") {
        handleIframeLoad();
      }
    } catch (err) {
      // Ignore errors on immediate check
    }

    return () => {
      iframe.removeEventListener("load", handleIframeLoad);
    };
  }, [iframeRef]);

  // This component doesn't render anything
  return null;
}
