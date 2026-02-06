import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Move,
  Square,
  Trash2,
  MousePointer2,
  Settings,
  CheckCircle2,
  Code,
  History,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";

interface BrowserRightPanelProps {
  repo: string;
  onTaskCreated?: () => void;
  onRequestCapture?: () => Promise<string | null>;
  projectPath?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
}

type Mode = "screen" | "properties" | "prompt";
type AnnotationType = "modify" | "move" | "remove";

interface Annotation {
  id: number;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number; // for modify and remove
  height?: number; // for modify and remove
  prompt: string;
}

interface ChangeEntry {
  id: string;
  timestamp: string;
  selector: string;
  property: string;
  previousValue: string;
  nextValue: string;
  source: "props" | "css";
}

interface ElementSelectionInfo {
  selector: string;
  tagName: string;
  textSnippet: string;
}

const MonacoEditor =
  dynamic<EditorProps>(
    () =>
      import("@monaco-editor/react").then(
        (mod) => mod.default,
      ),
    { ssr: false },
  );

const joinFsPath = (...parts: string[]) =>
  parts
    .filter(Boolean)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");

const rgbToHex = (value: string) => {
  const match = value
    .replace(/\s+/g, "")
    .match(/^rgba?\((\d+),(\d+),(\d+)/i);
  if (!match) return null;
  const toHex = (num: number) =>
    Math.max(0, Math.min(255, num))
      .toString(16)
      .padStart(2, "0");
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const getElementSelector = (element: Element) => {
  const testId =
    element.getAttribute("data-testid") ||
    element.getAttribute("data-test") ||
    element.getAttribute("data-qa");
  if (testId) return `[data-testid="${testId}"]`;

  if (element.id) return `#${element.id}`;

  const classList = Array.from(element.classList || []);
  if (classList.length > 0) {
    return `.${classList
      .slice(0, 2)
      .map((name) => name.trim())
      .filter(Boolean)
      .join(".")}`;
  }

  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName,
  );
  if (siblings.length <= 1) return tag;

  const index = siblings.indexOf(element) + 1;
  return `${tag}:nth-of-type(${index})`;
};

const asHTMLElement = (element: Element | null) => {
  if (!element) return null;
  const view = element.ownerDocument?.defaultView;
  if (view?.HTMLElement && element instanceof view.HTMLElement) {
    return element as HTMLElement;
  }
  if (element instanceof HTMLElement) {
    return element;
  }
  return null;
};

export function BrowserRightPanel({
  repo,
  onTaskCreated,
  onRequestCapture,
  projectPath,
  iframeRef,
}: BrowserRightPanelProps) {
  const [mode, setMode] = useState<Mode>("screen");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [nextId, setNextId] = useState(1);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);
  
  // Ref for the image container to calculate relative coordinates
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const screenshotImageRef = useRef<HTMLImageElement>(null);
  
  // Prompt mode state
  const [promptText, setPromptText] = useState("");
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Element selection / properties mode state
  const [elementPickerMode, setElementPickerMode] = useState<"properties" | "prompt" | null>(null);
  const [iframeAccessError, setIframeAccessError] = useState<string | null>(null);
  const [selectedElementInfo, setSelectedElementInfo] = useState<ElementSelectionInfo | null>(null);
  const selectedElementRef = useRef<Element | null>(null);
  const [propertiesTab, setPropertiesTab] = useState<"props" | "css" | "changes">("props");
  const [propsDraft, setPropsDraft] = useState({
    color: "",
    backgroundColor: "",
    padding: "",
    fontSize: "",
    visibility: "visible",
  });
  const [cssDraft, setCssDraft] = useState("");
  const lastCssTextRef = useRef<string>("");
  const cssChangeTimeoutRef = useRef<number | null>(null);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const highlightRefs = useRef<{
    hover?: HTMLDivElement | null;
    selected?: HTMLDivElement | null;
  }>({});
  
  // Task creation state
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const resetScreenState = () => {
    setScreenshot(null);
    setAnnotations([]);
    setSelectedTool(null);
    setSelectedAnnotationId(null);
    setNextId(1);
    setIsDrawing(false);
    setStartPos({ x: 0, y: 0 });
  };

  const recordChange = (entry: Omit<ChangeEntry, "id" | "timestamp">) => {
    const timestamp = new Date().toISOString();
    setChanges((prev) => [
      ...prev,
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp,
      },
    ]);
  };

  const tryGetIframeDocument = React.useCallback(() => {
    if (!iframeRef?.current) {
      setIframeAccessError(
        "Open a URL in the browser panel to enable element selection.",
      );
      return null;
    }
    try {
      const doc =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document ||
        null;
      if (!doc) {
        setIframeAccessError(
          "The preview is still loading. Try again in a moment.",
        );
        return null;
      }
      setIframeAccessError(null);
      return doc;
    } catch (error) {
      setIframeAccessError(
        "Element selection is unavailable for cross-origin pages. Use a same-origin preview.",
      );
      return null;
    }
  }, [iframeRef]);

  const ensureOverlay = React.useCallback((
    doc: Document,
    kind: "hover" | "selected",
  ) => {
    const id =
      kind === "hover"
        ? "agelum-hover-overlay"
        : "agelum-selected-overlay";
    const existing = doc.getElementById(id) as
      | HTMLDivElement
      | null;
    if (existing) return existing;

    const overlay = doc.createElement("div");
    overlay.id = id;
    overlay.setAttribute("data-agelum-overlay", "true");
    overlay.style.position = "fixed";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483647";
    overlay.style.border =
      kind === "hover"
        ? "2px dashed rgba(59, 130, 246, 0.9)"
        : "2px solid rgba(16, 185, 129, 0.9)";
    overlay.style.backgroundColor =
      kind === "hover"
        ? "rgba(59, 130, 246, 0.1)"
        : "rgba(16, 185, 129, 0.08)";
    overlay.style.boxSizing = "border-box";
    overlay.style.display = "none";
    const mountPoint =
      doc.body || doc.documentElement;
    if (mountPoint) {
      mountPoint.appendChild(overlay);
    }
    return overlay;
  }, []);

  const updateOverlayForElement = React.useCallback((
    overlay: HTMLDivElement | null | undefined,
    element: Element | null,
  ) => {
    if (!overlay) return;
    if (
      !element ||
      typeof (element as Element).getBoundingClientRect !==
        "function"
    ) {
      overlay.style.display = "none";
      return;
    }
    const rect = (
      element as Element
    ).getBoundingClientRect();
    if (!rect.width || !rect.height) {
      overlay.style.display = "none";
      return;
    }
    overlay.style.display = "block";
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }, []);

  const syncElementState = (element: Element, doc: Document) => {
    const selector = getElementSelector(element);
    const textSnippet = (element.textContent || "")
      .trim()
      .slice(0, 80);
    setSelectedElementInfo({
      selector,
      tagName: element.tagName.toLowerCase(),
      textSnippet,
    });
    selectedElementRef.current = element;

    const htmlElement = asHTMLElement(element);
    if (htmlElement) {
      const computed =
        doc.defaultView?.getComputedStyle(
          htmlElement,
        );
      setPropsDraft({
        color: computed?.color || "",
        backgroundColor: computed?.backgroundColor || "",
        padding: computed?.padding || "",
        fontSize: computed?.fontSize || "",
        visibility: computed?.visibility || "visible",
      });
      const styleText =
        htmlElement.getAttribute("style") ||
        htmlElement.style.cssText ||
        "";
      setCssDraft(styleText);
      lastCssTextRef.current = styleText;
    }
  };

  const applyStyleChange = (
    property: string,
    nextValue: string,
  ) => {
    const element = asHTMLElement(
      selectedElementRef.current,
    );
    if (!element) return;

    const prevValue = element.style.getPropertyValue(property);
    const trimmed = nextValue.trim();
    if (!trimmed) {
      element.style.removeProperty(property);
    } else {
      element.style.setProperty(property, trimmed);
    }
    const updatedValue =
      element.style.getPropertyValue(property);

    if (prevValue !== updatedValue) {
      recordChange({
        selector:
          selectedElementInfo?.selector ||
          getElementSelector(element),
        property,
        previousValue: prevValue || "(not set)",
        nextValue: updatedValue || "(cleared)",
        source: "props",
      });
    }

    const styleText =
      element.getAttribute("style") ||
      element.style.cssText ||
      "";
    setCssDraft(styleText);
    lastCssTextRef.current = styleText;
  };

  const insertPromptReference = React.useCallback((reference: string) => {
    const textarea = promptTextareaRef.current;
    const start = textarea?.selectionStart ?? null;
    const end = textarea?.selectionEnd ?? start;
    setPromptText((prev) => {
      const resolvedStart = start ?? prev.length;
      const resolvedEnd = end ?? resolvedStart;
      return (
        prev.slice(0, resolvedStart) +
        reference +
        prev.slice(resolvedEnd)
      );
    });
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = (start ?? textarea.value.length) + reference.length;
        textarea.selectionStart = cursor;
        textarea.selectionEnd = cursor;
      });
    }
  }, []);

  const toggleElementPicker = (
    target: "properties" | "prompt",
  ) => {
    if (elementPickerMode === target) {
      setElementPickerMode(null);
      return;
    }
    setElementPickerMode(target);
  };

  const requestIframeElementPick = React.useCallback((pickId: string) => {
    if (!iframeRef?.current?.contentWindow) {
      setIframeAccessError(
        "Unable to access iframe. Try reloading the page.",
      );
      return;
    }

    // Send pick request to iframe
    iframeRef.current.contentWindow.postMessage(
      {
        type: "agelum:pick-request",
        id: pickId,
      },
      "*",
    );
  }, [iframeRef]);

  const handleCaptureScreen = async () => {
    try {
      if (onRequestCapture) {
        const directCapture = await onRequestCapture();
        if (directCapture) {
          setScreenshot(directCapture);
          setAnnotations([]);
          setNextId(1);
          setSelectedAnnotationId(null);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      
      // Stop sharing
      track.stop();
      
      // Reset state
      setAnnotations([]);
      setNextId(1);
      setSelectedAnnotationId(null);
      
    } catch (err) {
      console.error("Error capturing screen:", err);
    }
  };

  useEffect(() => {
    if (!elementPickerMode) return;

    const pickId = `pick-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let isHandlingResponse = false;

    // Try direct DOM access first
    const doc = tryGetIframeDocument();
    if (doc) {
      // Direct access succeeded, use the iframe's DOM
      const hoverOverlay = ensureOverlay(doc, "hover");
      const selectedOverlay = ensureOverlay(doc, "selected");
      highlightRefs.current.hover = hoverOverlay;
      highlightRefs.current.selected = selectedOverlay;
      const previousCursor = doc.body?.style.cursor || "";
      if (doc.body) doc.body.style.cursor = "crosshair";

      const handleMouseMove = (event: Event) => {
        const target = event.target as Element | null;
        if (!target) return;
        if (target.getAttribute?.("data-agelum-overlay")) return;
        updateOverlayForElement(hoverOverlay, target);
      };

      const handleClick = (event: Event) => {
        const target = event.target as Element | null;
        if (!target) return;
        if (target.getAttribute?.("data-agelum-overlay")) return;
        event.preventDefault();
        event.stopPropagation();

        syncElementState(target, doc);
        updateOverlayForElement(selectedOverlay, target);

        if (elementPickerMode === "prompt") {
          const selector = getElementSelector(target);
          insertPromptReference(selector);
        }

        setElementPickerMode(null);
      };

      doc.addEventListener("mousemove", handleMouseMove, true);
      doc.addEventListener("click", handleClick, true);

      return () => {
        doc.removeEventListener(
          "mousemove",
          handleMouseMove,
          true,
        );
        doc.removeEventListener("click", handleClick, true);
        updateOverlayForElement(hoverOverlay, null);
        if (doc.body) doc.body.style.cursor = previousCursor;
      };
    }

    // Direct access failed, try postMessage + overlay approach for cross-origin iframes
    setIframeAccessError(
      "Using cross-origin element picker. Click an element in the preview.",
    );

    // Create a transparent overlay over the iframe for visual feedback and click capture
    const iframeEl = iframeRef?.current;
    let overlay: HTMLDivElement | null = null;
    let responseTimeout: ReturnType<typeof setTimeout> | null = null;

    const handlePickerMessage = (event: MessageEvent) => {
      const { data } = event;

      if (!data || data.id !== pickId) return;

      if (data.type === "agelum:pick-response" && data.element) {
        isHandlingResponse = true;
        const elementInfo = data.element as ElementSelectionInfo;
        setSelectedElementInfo(elementInfo);
        selectedElementRef.current = null; // Can't keep ref for cross-origin elements

        if (elementPickerMode === "prompt") {
          insertPromptReference(elementInfo.selector);
        }

        setIframeAccessError(null);
        setElementPickerMode(null);
        cleanup();
      } else if (data.type === "agelum:pick-cancel") {
        isHandlingResponse = true;
        setElementPickerMode(null);
        setIframeAccessError(null);
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener("message", handlePickerMessage);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      overlay = null;
      if (responseTimeout) {
        clearTimeout(responseTimeout);
        responseTimeout = null;
      }
    };

    if (iframeEl) {
      overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.cursor = "crosshair";
      overlay.style.zIndex = "2147483646";
      overlay.style.background = "rgba(59, 130, 246, 0.05)";
      overlay.style.transition = "background 0.15s";

      const positionOverlay = () => {
        if (!iframeEl || !overlay) return;
        const rect = iframeEl.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
      };

      positionOverlay();

      const handleOverlayClick = (e: Event) => {
        const mouseEvent = e as MouseEvent;
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        if (!iframeEl) return;
        const rect = iframeEl.getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left;
        const y = mouseEvent.clientY - rect.top;

        // Send coordinate-based pick to iframe
        iframeEl.contentWindow?.postMessage(
          {
            type: "agelum:pick-at-point",
            id: pickId,
            x,
            y,
          },
          "*",
        );

        // Also try click-based pick as fallback
        requestIframeElementPick(pickId);

        // Timeout if iframe doesn't respond
        responseTimeout = setTimeout(() => {
          if (!isHandlingResponse) {
            setIframeAccessError(
              "No response from the preview. The page may not support element picking.",
            );
            setElementPickerMode(null);
            cleanup();
          }
        }, 3000);
      };

      overlay.addEventListener("click", handleOverlayClick);
      window.addEventListener("resize", positionOverlay);
      window.addEventListener("scroll", positionOverlay, true);
      document.body.appendChild(overlay);

      // Store resize/scroll handlers for cleanup
      const _positionOverlay = positionOverlay;
      const _handleOverlayClick = handleOverlayClick;

      // Extend cleanup to remove overlay event listeners
      const originalCleanup = cleanup;
      const fullCleanup = () => {
        originalCleanup();
        window.removeEventListener("resize", _positionOverlay);
        window.removeEventListener("scroll", _positionOverlay, true);
      };

      window.addEventListener("message", handlePickerMessage);

      return fullCleanup;
    }

    // No iframe element available, just listen for messages
    requestIframeElementPick(pickId);
    window.addEventListener("message", handlePickerMessage);

    return cleanup;
  }, [elementPickerMode, requestIframeElementPick, tryGetIframeDocument, insertPromptReference, updateOverlayForElement, ensureOverlay]);

  useEffect(() => {
    if (!selectedElementInfo) {
      updateOverlayForElement(
        highlightRefs.current.selected,
        null,
      );
      return;
    }
    const doc = tryGetIframeDocument();
    if (!doc) return;
    updateOverlayForElement(
      ensureOverlay(doc, "selected"),
      selectedElementRef.current,
    );
  }, [selectedElementInfo, tryGetIframeDocument, ensureOverlay, updateOverlayForElement]);

  useEffect(() => {
    return () => {
      if (cssChangeTimeoutRef.current) {
        window.clearTimeout(
          cssChangeTimeoutRef.current,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (mode === "screen") {
      setElementPickerMode(null);
    }
  }, [mode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !selectedTool || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    
    // Only add if it has some size or is a move (point)
    if (selectedTool === 'move' || (width > 5 && height > 5)) {
      const annotationId = nextId;
      const newAnnotation: Annotation = {
        id: annotationId,
        type: selectedTool,
        x: selectedTool === 'move' ? currentX : x,
        y: selectedTool === 'move' ? currentY : y,
        width: selectedTool === 'move' ? 0 : width,
        height: selectedTool === 'move' ? 0 : height,
        prompt: ""
      };
      
      setAnnotations((prev) => [...prev, newAnnotation]);
      setNextId((prev) => prev + 1);
      setSelectedAnnotationId(annotationId);
    }
    
    setIsDrawing(false);
    // Optional: Keep tool selected? user requested 'first it has buttons for...' 
    // Usually better to reset tool or keep it? Let's keep it for multiple annotations.
  };

  const handlePropValueChange = (
    property: keyof typeof propsDraft,
    value: string,
  ) => {
    setPropsDraft((prev) => ({
      ...prev,
      [property]: value,
    }));

    if (property === "fontSize") {
      const normalized = /^\d+(\.\d+)?$/.test(
        value.trim(),
      )
        ? `${value.trim()}px`
        : value;
      applyStyleChange("font-size", normalized);
      return;
    }

    if (property === "backgroundColor") {
      applyStyleChange("background-color", value);
      return;
    }

    applyStyleChange(property, value);
  };

  const handleCssDraftChange = (nextValue: string) => {
    setCssDraft(nextValue);
    const element = asHTMLElement(
      selectedElementRef.current,
    );
    if (!element) return;

    const previous = lastCssTextRef.current;
    element.style.cssText = nextValue;

    if (cssChangeTimeoutRef.current) {
      window.clearTimeout(
        cssChangeTimeoutRef.current,
      );
    }

    const selector =
      selectedElementInfo?.selector ||
      getElementSelector(element);
    cssChangeTimeoutRef.current = window.setTimeout(
      () => {
        if (previous === nextValue) return;
        recordChange({
          selector,
          property: "style",
          previousValue: previous || "(empty)",
          nextValue: nextValue || "(empty)",
          source: "css",
        });
        lastCssTextRef.current = nextValue;
      },
      700,
    );
  };

  const handleDeleteAnnotation = (id: number) => {
    setAnnotations((prev) =>
      prev.filter((a) => a.id !== id),
    );
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const handleCreateTask = async () => {
    if (!repo) return;
    setIsCreatingTask(true);
    
    try {
      let imageRelativePath = "";
      if (mode === "screen" && screenshot) {
        if (!projectPath) {
          throw new Error(
            "Project path is required to save screenshots.",
          );
        }

        const canvas = document.createElement("canvas");
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(
              new Error("Failed to load screenshot"),
            );
          img.src = screenshot;
        });

        const naturalWidth =
          img.naturalWidth || img.width;
        const naturalHeight =
          img.naturalHeight || img.height;
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          const displayWidth =
            screenshotImageRef.current
              ?.clientWidth || naturalWidth;
          const displayHeight =
            screenshotImageRef.current
              ?.clientHeight || naturalHeight;

          const scaleX =
            naturalWidth / displayWidth;
          const scaleY =
            naturalHeight / displayHeight;
          const scale =
            Math.min(scaleX, scaleY) || 1;

          annotations.forEach((ann) => {
            const mappedX = ann.x * scaleX;
            const mappedY = ann.y * scaleY;
            const mappedWidth =
              (ann.width || 0) * scaleX;
            const mappedHeight =
              (ann.height || 0) * scaleY;

            const badgeRadius = Math.max(
              10,
              10 * scale,
            );
            const strokeWidth = Math.max(
              2,
              2 * scale,
            );
            const fontSize = Math.max(
              12,
              12 * scale,
            );

            if (ann.type === "move") {
              const pointX = mappedX;
              const pointY = mappedY;
              ctx.strokeStyle = "#3b82f6";
              ctx.lineWidth = strokeWidth;
              ctx.beginPath();
              ctx.arc(
                pointX,
                pointY,
                12 * scale,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(pointX - 12 * scale, pointY);
              ctx.lineTo(pointX + 12 * scale, pointY);
              ctx.moveTo(pointX, pointY - 12 * scale);
              ctx.lineTo(pointX, pointY + 12 * scale);
              ctx.stroke();

              ctx.fillStyle = "#111827";
              ctx.beginPath();
              ctx.arc(
                pointX + badgeRadius,
                pointY - badgeRadius,
                badgeRadius,
                0,
                Math.PI * 2,
              );
              ctx.fill();
              ctx.fillStyle = "#ffffff";
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(
                String(ann.id),
                pointX + badgeRadius,
                pointY - badgeRadius,
              );
              return;
            }

            const color =
              ann.type === "remove"
                ? "#dc2626"
                : "#f59e0b";
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = color;
            ctx.fillStyle =
              ann.type === "remove"
                ? "rgba(220, 38, 38, 0.12)"
                : "rgba(245, 158, 11, 0.12)";
            ctx.strokeRect(
              mappedX,
              mappedY,
              mappedWidth,
              mappedHeight,
            );
            ctx.fillRect(
              mappedX,
              mappedY,
              mappedWidth,
              mappedHeight,
            );

            if (ann.type === "remove") {
              const label = "REMOVE THIS";
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              const labelPadding = 6 * scale;
              const labelWidth =
                ctx.measureText(label).width +
                labelPadding * 2;
              const labelHeight = fontSize + 6 * scale;
              const labelX = mappedX;
              const labelY = Math.max(
                0,
                mappedY - labelHeight - 4 * scale,
              );
              ctx.fillStyle = "#dc2626";
              ctx.fillRect(
                labelX,
                labelY,
                labelWidth,
                labelHeight,
              );
              ctx.fillStyle = "#ffffff";
              ctx.fillText(
                label,
                labelX + labelPadding,
                labelY + labelHeight / 2,
              );
            }

            const badgeX =
              mappedX + mappedWidth + badgeRadius;
            const badgeY =
              mappedY - badgeRadius;
            ctx.fillStyle = "#111827";
            ctx.beginPath();
            ctx.arc(
              badgeX,
              badgeY,
              badgeRadius,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              String(ann.id),
              badgeX,
              badgeY,
            );
          });
        }

        const compositeDataUrl = canvas.toDataURL(
          "image/png",
        );
        const base64Data =
          compositeDataUrl.replace(
            /^data:image\/\w+;base64,/,
            "",
          );
        const timestamp = Date.now();
        const fileName = `screenshot-${timestamp}.png`;
        const absolutePath = joinFsPath(
          projectPath,
          ".agelum",
          "work",
          "tasks",
          "images",
          fileName,
        );

        const saveRes = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: absolutePath,
            content: base64Data,
            encoding: "base64",
          }),
        });
        if (!saveRes.ok) {
          const result = await saveRes.json();
          throw new Error(
            result?.error ||
              "Failed to save screenshot",
          );
        }
        imageRelativePath = `../images/${fileName}`;
      }

      let taskTitle = "";
      let taskBody = "";
      
      if (mode === "screen") {
        taskTitle = `UI Fixes - ${new Date().toLocaleString()}`;
        taskBody = `Source: Browser Screenshot\n\n`;
        if (imageRelativePath) {
          taskBody += `![Screenshot](${imageRelativePath})\n\n`;
        }
        taskBody += `## Annotations\n\n`;
        if (annotations.length === 0) {
          taskBody += `No annotations were added.\n\n`;
        } else {
          taskBody += `| # | Action | Prompt |\n| - | - | - |\n`;
          annotations.forEach((ann) => {
            const action =
              ann.type === "remove"
                ? "REMOVE"
                : ann.type === "move"
                  ? "MOVE"
                  : "MODIFY";
            const safePrompt = (ann.prompt || "")
              .replace(/\n/g, " ")
              .replace(/\|/g, "\\|")
              .trim() || "No details provided.";
            taskBody += `| ${ann.id} | ${action} | ${safePrompt} |\n`;
          });
          taskBody += `\n`;
        }
      } else if (mode === "prompt") {
        taskTitle = `Browser Task - ${new Date().toLocaleString()}`;
        taskBody = promptText;
      } else if (mode === "properties") {
        taskTitle = `Style Tweaks - ${new Date().toLocaleString()}`;
        taskBody = `Source: Browser Properties Editor\n\n`;
        if (selectedElementInfo) {
          taskBody += `Selected Element: \`${selectedElementInfo.selector}\`\n\n`;
        }
        taskBody += `## Changes\n\n`;
        if (changes.length === 0) {
          taskBody += `No changes were recorded.\n\n`;
        } else {
          taskBody += `| # | Selector | Property | From | To |\n| - | - | - | - | - |\n`;
          changes.forEach((change, index) => {
            const safeSelector = change.selector
              .replace(/\n/g, " ")
              .replace(/\|/g, "\\|");
            const safePrev = change.previousValue
              .replace(/\n/g, " ")
              .replace(/\|/g, "\\|");
            const safeNext = change.nextValue
              .replace(/\n/g, " ")
              .replace(/\|/g, "\\|");
            taskBody += `| ${index + 1} | ${safeSelector} | ${change.property} | ${safePrev} | ${safeNext} |\n`;
          });
          taskBody += `\n`;
        }
      }
      
      // Call API to create task
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           repo,
           title: taskTitle,
           description: taskBody,
           state: "priority"
        })
      });
      
      if (res.ok) {
        resetScreenState();
        setPromptText("");
        setChanges([]);
        setSelectedElementInfo(null);
        selectedElementRef.current = null;
        setCssDraft("");
        setPropsDraft({
          color: "",
          backgroundColor: "",
          padding: "",
          fontSize: "",
          visibility: "visible",
        });
        setElementPickerMode(null);
        setIframeAccessError(null);
        onTaskCreated?.();
      }

    } catch (e) {
      console.error("Failed to create task", e);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const isModeLocked =
    Boolean(screenshot) || elementPickerMode !== null;
  const lockMessage = screenshot
    ? "Finish or cancel the screenshot to switch modes."
    : elementPickerMode
      ? "Exit element selection to switch modes."
      : null;
  const isTabDisabled = (nextMode: Mode) =>
    nextMode !== mode && isModeLocked;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[300px]">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setMode("screen")}
          disabled={isTabDisabled("screen")}
          className={`flex-1 py-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "screen" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Screen
        </button>
        <button
          onClick={() => setMode("properties")}
          disabled={isTabDisabled("properties")}
          className={`flex-1 py-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "properties" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Properties
        </button>
        <button
          onClick={() => setMode("prompt")}
          disabled={isTabDisabled("prompt")}
          className={`flex-1 py-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "prompt" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Prompt
        </button>
      </div>
      {lockMessage && (
        <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-border bg-secondary/20">
          {lockMessage}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {mode === "screen" && (
          <div className="space-y-4">
            {!screenshot ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-secondary/20">
                <button
                  onClick={handleCaptureScreen}
                  className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Capture Screen</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Canvas */}
                <div 
                    ref={imageContainerRef}
                    className="relative border border-border rounded-lg overflow-hidden cursor-crosshair select-none"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                  <img
                    ref={screenshotImageRef}
                    src={screenshot}
                    alt="Screenshot"
                    className="w-full h-auto block"
                    draggable={false}
                  />
                  
                  {/* Annotations Overlay */}
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="absolute"
                      style={{
                        left: ann.x,
                        top: ann.y,
                        width: ann.width || (ann.type === "move" ? 20 : 0),
                        height: ann.height || (ann.type === "move" ? 20 : 0),
                        border: ann.type === "remove" ? "2px solid red" : ann.type === "modify" ? "2px solid orange" : "none",
                        backgroundColor: ann.type === "remove" ? "rgba(255, 0, 0, 0.2)" : ann.type === "modify" ? "rgba(255, 165, 0, 0.2)" : "transparent",
                      }}
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                      }}
                    >
                        {ann.type === "remove" && (
                            <div className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] px-1 rounded-sm whitespace-nowrap">
                                REMOVE THIS
                            </div>
                        )}
                        {ann.type === "move" && (
                             <Move className="text-blue-500 w-6 h-6 -translate-x-1/2 -translate-y-1/2 filter drop-shadow-md" />
                        )}
                        
                        {/* Number Badge */}
                        <div className="absolute -top-3 -right-3 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] border border-white shadow-sm z-10">
                            {ann.id}
                        </div>
                    </div>
                  ))}
                  
                  {isDrawing && (
                      <div className="absolute border font-xs text-white bg-black/50 px-1 rounded" style={{ top: startPos.y, left: startPos.x }}>
                          Drawing...
                      </div>
                  )}
                </div>

                {/* Toolbar */}
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => setSelectedTool("modify")}
                        className={`p-2 rounded border ${selectedTool === "modify" ? "bg-orange-100 border-orange-500 text-orange-700" : "bg-background border-border"}`}
                        title="Modify"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSelectedTool("move")}
                        className={`p-2 rounded border ${selectedTool === "move" ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-background border-border"}`}
                        title="Move"
                    >
                        <Move className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSelectedTool("remove")}
                        className={`p-2 rounded border ${selectedTool === "remove" ? "bg-red-100 border-red-500 text-red-700" : "bg-background border-border"}`}
                        title="Remove"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Selected Annotation Prompt */}
                {selectedAnnotationId !== null && (
                    <div className="p-3 bg-secondary/30 rounded border border-border space-y-2">
                         <div className="flex justify-between items-center">
                             <span className="text-xs font-medium">Data for item #{selectedAnnotationId}</span>
                             <button onClick={() => handleDeleteAnnotation(selectedAnnotationId)} className="text-red-500 hover:text-red-700">
                                 <Trash2 className="w-3 h-3" />
                             </button>
                         </div>
                         <textarea 
                            className="w-full text-xs p-2 rounded border border-border bg-background h-20 resize-none focus:outline-none focus:ring-1"
                            placeholder="Instructions for this change..."
                            value={annotations.find(a => a.id === selectedAnnotationId)?.prompt || ""}
                            onChange={(e) => {
                                setAnnotations(annotations.map(a => a.id === selectedAnnotationId ? { ...a, prompt: e.target.value } : a));
                            }}
                         />
                    </div>
                )}
                
                <button
                  onClick={resetScreenState}
                  className="w-full py-2 text-xs text-red-500 border border-red-200 hover:bg-red-50 rounded"
                >
                  Cancel / Retake
                </button>
              </div>
            )}
          </div>
        )}

        {mode === "properties" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleElementPicker("properties")}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded border ${
                    elementPickerMode === "properties"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <MousePointer2 className="w-3 h-3" />
                  {elementPickerMode === "properties"
                    ? "Click an element..."
                    : "Pick Element"}
                </button>
                {selectedElementInfo && (
                  <button
                    onClick={() => {
                      setSelectedElementInfo(null);
                      selectedElementRef.current = null;
                      updateOverlayForElement(
                        highlightRefs.current.selected,
                        null,
                      );
                      setPropsDraft({
                        color: "",
                        backgroundColor: "",
                        padding: "",
                        fontSize: "",
                        visibility: "visible",
                      });
                      setCssDraft("");
                      lastCssTextRef.current = "";
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {iframeAccessError && (
                <div className="text-xs text-red-500">
                  {iframeAccessError}
                </div>
              )}

              {selectedElementInfo ? (
                <div className="rounded border border-border bg-secondary/20 p-2 text-xs space-y-1">
                  <div className="font-medium text-foreground">
                    {selectedElementInfo.selector}
                  </div>
                  <div className="text-muted-foreground">
                    {selectedElementInfo.tagName}
                    {selectedElementInfo.textSnippet
                      ? ` · ${selectedElementInfo.textSnippet}`
                      : ""}
                  </div>
                </div>
              ) : (
                <div className="rounded border border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
                  Pick an element in the preview to start editing styles.
                </div>
              )}

              <div className="flex border-b border-border">
                <button
                  onClick={() => setPropertiesTab("props")}
                  className={`flex-1 text-xs py-1 border-b-2 ${
                    propertiesTab === "props"
                      ? "border-primary font-bold"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  <Settings className="inline w-3 h-3 mr-1" />
                  Props
                </button>
                <button
                  onClick={() => setPropertiesTab("css")}
                  className={`flex-1 text-xs py-1 border-b-2 ${
                    propertiesTab === "css"
                      ? "border-primary font-bold"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  <Code className="inline w-3 h-3 mr-1" />
                  CSS
                </button>
                <button
                  onClick={() => setPropertiesTab("changes")}
                  className={`flex-1 text-xs py-1 border-b-2 ${
                    propertiesTab === "changes"
                      ? "border-primary font-bold"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  <History className="inline w-3 h-3 mr-1" />
                  Changes
                </button>
              </div>

              {propertiesTab === "props" && (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-muted-foreground">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={
                          rgbToHex(propsDraft.color) ||
                          "#000000"
                        }
                        onChange={(e) =>
                          handlePropValueChange(
                            "color",
                            e.target.value,
                          )
                        }
                        disabled={!selectedElementInfo}
                        className="h-8 w-12 border border-border rounded"
                      />
                      <input
                        type="text"
                        value={propsDraft.color}
                        onChange={(e) =>
                          handlePropValueChange(
                            "color",
                            e.target.value,
                          )
                        }
                        disabled={!selectedElementInfo}
                        className="flex-1 px-2 py-1 border border-border rounded bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground">
                      Background Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={
                          rgbToHex(
                            propsDraft.backgroundColor,
                          ) || "#ffffff"
                        }
                        onChange={(e) =>
                          handlePropValueChange(
                            "backgroundColor",
                            e.target.value,
                          )
                        }
                        disabled={!selectedElementInfo}
                        className="h-8 w-12 border border-border rounded"
                      />
                      <input
                        type="text"
                        value={propsDraft.backgroundColor}
                        onChange={(e) =>
                          handlePropValueChange(
                            "backgroundColor",
                            e.target.value,
                          )
                        }
                        disabled={!selectedElementInfo}
                        className="flex-1 px-2 py-1 border border-border rounded bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground">
                      Padding
                    </label>
                    <input
                      type="text"
                      value={propsDraft.padding}
                      onChange={(e) =>
                        handlePropValueChange(
                          "padding",
                          e.target.value,
                        )
                      }
                      disabled={!selectedElementInfo}
                      className="w-full px-2 py-1 border border-border rounded bg-background"
                      placeholder="e.g. 12px 16px"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground">
                      Font Size
                    </label>
                    <input
                      type="text"
                      value={propsDraft.fontSize}
                      onChange={(e) =>
                        handlePropValueChange(
                          "fontSize",
                          e.target.value,
                        )
                      }
                      disabled={!selectedElementInfo}
                      className="w-full px-2 py-1 border border-border rounded bg-background"
                      placeholder="e.g. 16px"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground">
                      Visibility
                    </label>
                    <select
                      value={propsDraft.visibility}
                      onChange={(e) =>
                        handlePropValueChange(
                          "visibility",
                          e.target.value,
                        )
                      }
                      disabled={!selectedElementInfo}
                      className="w-full px-2 py-1 border border-border rounded bg-background"
                    >
                      <option value="visible">visible</option>
                      <option value="hidden">hidden</option>
                      <option value="collapse">collapse</option>
                    </select>
                  </div>
                </div>
              )}

              {propertiesTab === "css" && (
                <div className="space-y-2">
                  {selectedElementInfo ? (
                    <MonacoEditor
                      height="180px"
                      language="css"
                      theme="vs-dark"
                      value={cssDraft}
                      onChange={(value) =>
                        handleCssDraftChange(value || "")
                      }
                      options={{
                        minimap: { enabled: false },
                        lineNumbers: "off",
                        fontSize: 12,
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                      }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Select an element to edit its inline styles.
                    </div>
                  )}
                </div>
              )}

              {propertiesTab === "changes" && (
                <div className="space-y-2">
                  {changes.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Changes will appear here as you tweak styles.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-auto pr-1">
                      {changes.map((change) => (
                        <div
                          key={change.id}
                          className="rounded border border-border bg-secondary/10 p-2 text-xs space-y-1"
                        >
                          <div className="font-medium text-foreground">
                            {change.property}
                          </div>
                          <div className="text-muted-foreground">
                            {change.selector}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {change.previousValue} →{" "}
                            </span>
                            <span>{change.nextValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
        )}

        {mode === "prompt" && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleElementPicker("prompt")}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded border ${
                    elementPickerMode === "prompt"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <MousePointer2 className="w-3 h-3" />
                  {elementPickerMode === "prompt"
                    ? "Click an element..."
                    : "Insert Element Ref"}
                </button>
                {selectedElementInfo && (
                  <div className="text-[11px] text-muted-foreground">
                    Last:{" "}
                    <span className="font-medium text-foreground">
                      {selectedElementInfo.selector}
                    </span>
                  </div>
                )}
              </div>
              {iframeAccessError && (
                <div className="text-xs text-red-500">
                  {iframeAccessError}
                </div>
              )}
              <textarea 
                ref={promptTextareaRef}
                className="flex-1 w-full text-sm p-3 rounded border border-border bg-background resize-none focus:outline-none focus:ring-1"
                placeholder="Describe the task referencing elements..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-border bg-secondary/10">
        <button
          onClick={handleCreateTask}
          disabled={isCreatingTask || (mode === "screen" && !screenshot) || (mode === "prompt" && !promptText)}
          className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreatingTask ? "Creating..." : "Create Task"}
          {!isCreatingTask && <CheckCircle2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
