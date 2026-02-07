import React, {
  useState,
  useRef,
  useEffect,
} from "react";
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
import { AnnotationPromptList } from "../AnnotationPromptList";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";
import {
  Annotation,
  AnnotationType,
} from "@/types/entities";
import { PanelProps } from "./types";

type Mode =
  | "screen"
  | "properties"
  | "prompt";

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

const joinFsPath = (
  ...parts: string[]
) =>
  parts
    .filter(Boolean)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");

const rgbToHex = (value: string) => {
  const match = value
    .replace(/\s+/g, "")
    .match(
      /^rgba?\((\d+),(\d+),(\d+)/i,
    );
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

const getElementSelector = (
  element: Element,
) => {
  const testId =
    element.getAttribute(
      "data-testid",
    ) ||
    element.getAttribute("data-test") ||
    element.getAttribute("data-qa");
  if (testId)
    return `[data-testid="${testId}"]`;

  if (element.id)
    return `#${element.id}`;

  const classList = Array.from(
    element.classList || [],
  );
  if (classList.length > 0) {
    return `.${classList
      .slice(0, 2)
      .map((name) => name.trim())
      .filter(Boolean)
      .join(".")}`;
  }

  const tag =
    element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(
    parent.children,
  ).filter(
    (child) =>
      child.tagName === element.tagName,
  );
  if (siblings.length <= 1) return tag;

  const index =
    siblings.indexOf(element) + 1;
  return `${tag}:nth-of-type(${index})`;
};

const asHTMLElement = (
  element: Element | null,
) => {
  if (!element) return null;
  const view =
    element.ownerDocument?.defaultView;
  if (
    view?.HTMLElement &&
    element instanceof view.HTMLElement
  ) {
    return element as HTMLElement;
  }
  if (element instanceof HTMLElement) {
    return element;
  }
  return null;
};

export function TaskPanel({
  repo,
  onTaskCreated,
  onRequestCapture,
  projectPath,
  iframeRef,
  electronBrowserView,
  isScreenshotMode,
  onScreenshotModeChange,
  screenshot,
  onScreenshotChange,
  annotations = [],
  onAnnotationsChange,
  selectedAnnotationId,
  onSelectAnnotation,
  selectedTool,
  onToolSelect,
  screenshotDisplaySize,
}: PanelProps) {
  const [mode, setMode] =
    useState<Mode>("screen");

  const [isDrawing, setIsDrawing] =
    useState(false);
  const [startPos, setStartPos] =
    useState({ x: 0, y: 0 });
  const [nextId, setNextId] =
    useState(1);
  const [
    showAnnotationModal,
    setShowAnnotationModal,
  ] = useState(false);

  // Ref for the image container to calculate relative coordinates
  const imageContainerRef =
    useRef<HTMLDivElement>(null);

  // Prompt mode state
  const [promptText, setPromptText] =
    useState("");
  const promptTextareaRef =
    useRef<HTMLTextAreaElement>(null);
  const [
    generalPrompt,
    setGeneralPrompt,
  ] = useState("");
  const [
    selectedGeneralPrompt,
    setSelectedGeneralPrompt,
  ] = useState(false);

  // Element selection / properties mode state
  const [
    elementPickerMode,
    setElementPickerMode,
  ] = useState<
    "properties" | "prompt" | null
  >(null);
  const [
    iframeAccessError,
    setIframeAccessError,
  ] = useState<string | null>(null);
  const [
    selectedElementInfo,
    setSelectedElementInfo,
  ] =
    useState<ElementSelectionInfo | null>(
      null,
    );
  const selectedElementRef =
    useRef<Element | null>(null);
  const [
    propertiesTab,
    setPropertiesTab,
  ] = useState<
    "props" | "css" | "changes"
  >("props");
  const [propsDraft, setPropsDraft] =
    useState({
      color: "",
      backgroundColor: "",
      padding: "",
      fontSize: "",
      visibility: "visible",
    });
  const [cssDraft, setCssDraft] =
    useState("");
  const lastCssTextRef =
    useRef<string>("");
  const cssChangeTimeoutRef = useRef<
    number | null
  >(null);
  const [changes, setChanges] =
    useState<ChangeEntry[]>([]);
  const highlightRefs = useRef<{
    hover?: HTMLDivElement | null;
    selected?: HTMLDivElement | null;
  }>({});

  // Task creation state
  const [
    isCreatingTask,
    setIsCreatingTask,
  ] = useState(false);

  const resetScreenState = () => {
    onScreenshotChange?.(null);
    onAnnotationsChange?.([]);
    onToolSelect?.(null);
    onSelectAnnotation?.(null);
    setNextId(1);
    setIsDrawing(false);
    setStartPos({ x: 0, y: 0 });
    onScreenshotModeChange?.(false);
  };

  const recordChange = (
    entry: Omit<
      ChangeEntry,
      "id" | "timestamp"
    >,
  ) => {
    const timestamp =
      new Date().toISOString();
    setChanges((prev) => [
      ...prev,
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp,
      },
    ]);
  };

  const tryGetIframeDocument =
    React.useCallback(() => {
      if (!iframeRef?.current) {
        setIframeAccessError(
          "Open a URL in the browser panel to enable element selection.",
        );
        return null;
      }
      try {
        const doc =
          iframeRef.current
            .contentDocument ||
          iframeRef.current
            .contentWindow?.document ||
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

  const ensureOverlay =
    React.useCallback(
      (
        doc: Document,
        kind: "hover" | "selected",
      ) => {
        const id =
          kind === "hover"
            ? "agelum-hover-overlay"
            : "agelum-selected-overlay";
        const existing =
          doc.getElementById(
            id,
          ) as HTMLDivElement | null;
        if (existing) return existing;

        const overlay =
          doc.createElement("div");
        overlay.id = id;
        overlay.setAttribute(
          "data-agelum-overlay",
          "true",
        );
        overlay.style.position =
          "fixed";
        overlay.style.pointerEvents =
          "none";
        overlay.style.zIndex =
          "2147483647";
        overlay.style.border =
          kind === "hover"
            ? "2px dashed rgba(59, 130, 246, 0.9)"
            : "2px solid rgba(16, 185, 129, 0.9)";
        overlay.style.backgroundColor =
          kind === "hover"
            ? "rgba(59, 130, 246, 0.1)"
            : "rgba(16, 185, 129, 0.08)";
        overlay.style.boxSizing =
          "border-box";
        overlay.style.display = "none";
        const mountPoint =
          doc.body ||
          doc.documentElement;
        if (mountPoint) {
          mountPoint.appendChild(
            overlay,
          );
        }
        return overlay;
      },
      [],
    );

  const updateOverlayForElement =
    React.useCallback(
      (
        overlay:
          | HTMLDivElement
          | null
          | undefined,
        element: Element | null,
      ) => {
        if (!overlay) return;
        if (
          !element ||
          typeof (element as Element)
            .getBoundingClientRect !==
            "function"
        ) {
          overlay.style.display =
            "none";
          return;
        }
        const rect = (
          element as Element
        ).getBoundingClientRect();
        if (
          !rect.width ||
          !rect.height
        ) {
          overlay.style.display =
            "none";
          return;
        }
        overlay.style.display = "block";
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
      },
      [],
    );

  const syncElementState = (
    element: Element,
    doc: Document,
  ) => {
    const selector =
      getElementSelector(element);
    const textSnippet = (
      element.textContent || ""
    )
      .trim()
      .slice(0, 80);
    setSelectedElementInfo({
      selector,
      tagName:
        element.tagName.toLowerCase(),
      textSnippet,
    });
    selectedElementRef.current =
      element;

    const htmlElement =
      asHTMLElement(element);
    if (htmlElement) {
      const computed =
        doc.defaultView?.getComputedStyle(
          htmlElement,
        );
      setPropsDraft({
        color: computed?.color || "",
        backgroundColor:
          computed?.backgroundColor ||
          "",
        padding:
          computed?.padding || "",
        fontSize:
          computed?.fontSize || "",
        visibility:
          computed?.visibility ||
          "visible",
      });
      const styleText =
        htmlElement.getAttribute(
          "style",
        ) ||
        htmlElement.style.cssText ||
        "";
      setCssDraft(styleText);
      lastCssTextRef.current =
        styleText;
    }
  };

  const applyStyleChange = (
    property: string,
    nextValue: string,
  ) => {
    // Electron path: apply style via executeJs
    if (
      electronBrowserView &&
      selectedElementInfo
    ) {
      const selector =
        selectedElementInfo.selector;
      const trimmed = nextValue.trim();
      const escapedProp =
        property.replace(/'/g, "\\'");
      const escapedVal =
        trimmed.replace(/'/g, "\\'");
      const escapedSel =
        selector.replace(/'/g, "\\'");
      electronBrowserView
        .executeJs(
          `
        (function() {
          var el = document.querySelector('${escapedSel}');
          if (!el) return null;
          var prev = el.style.getPropertyValue('${escapedProp}');
          if (!('${escapedVal}')) {
            el.style.removeProperty('${escapedProp}');
          } else {
            el.style.setProperty('${escapedProp}', '${escapedVal}');
          }
          var updated = el.style.getPropertyValue('${escapedProp}');
          return { prev: prev, updated: updated, cssText: el.style.cssText };
        })()
      `,
        )
        .then((result: unknown) => {
          const res = result as {
            prev: string;
            updated: string;
            cssText: string;
          } | null;
          if (
            res &&
            res.prev !== res.updated
          ) {
            recordChange({
              selector,
              property,
              previousValue:
                res.prev || "(not set)",
              nextValue:
                res.updated ||
                "(cleared)",
              source: "props",
            });
          }
          if (res) {
            setCssDraft(
              res.cssText || "",
            );
            lastCssTextRef.current =
              res.cssText || "";
          }
        });
      return;
    }

    // Iframe path: direct DOM access
    const element = asHTMLElement(
      selectedElementRef.current,
    );
    if (!element) return;

    const prevValue =
      element.style.getPropertyValue(
        property,
      );
    const trimmed = nextValue.trim();
    if (!trimmed) {
      element.style.removeProperty(
        property,
      );
    } else {
      element.style.setProperty(
        property,
        trimmed,
      );
    }
    const updatedValue =
      element.style.getPropertyValue(
        property,
      );

    if (prevValue !== updatedValue) {
      recordChange({
        selector:
          selectedElementInfo?.selector ||
          getElementSelector(element),
        property,
        previousValue:
          prevValue || "(not set)",
        nextValue:
          updatedValue || "(cleared)",
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

  const insertPromptReference =
    React.useCallback(
      (reference: string) => {
        const textarea =
          promptTextareaRef.current;
        const start =
          textarea?.selectionStart ??
          null;
        const end =
          textarea?.selectionEnd ??
          start;
        setPromptText((prev) => {
          const resolvedStart =
            start ?? prev.length;
          const resolvedEnd =
            end ?? resolvedStart;
          return (
            prev.slice(
              0,
              resolvedStart,
            ) +
            reference +
            prev.slice(resolvedEnd)
          );
        });
        if (textarea) {
          requestAnimationFrame(() => {
            textarea.focus();
            const cursor =
              (start ??
                textarea.value.length) +
              reference.length;
            textarea.selectionStart =
              cursor;
            textarea.selectionEnd =
              cursor;
          });
        }
      },
      [],
    );

  const toggleElementPicker = (
    target: "properties" | "prompt",
  ) => {
    if (elementPickerMode === target) {
      setElementPickerMode(null);
      return;
    }
    setElementPickerMode(target);
  };

  const requestIframeElementPick =
    React.useCallback(
      (pickId: string) => {
        if (
          !iframeRef?.current
            ?.contentWindow
        ) {
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
      },
      [iframeRef],
    );

  const handleCaptureScreen =
    async () => {
      try {
        if (onRequestCapture) {
          const directCapture =
            await onRequestCapture();
          if (directCapture) {
            onScreenshotChange?.(
              directCapture,
            );
            onAnnotationsChange?.([]);
            setNextId(1);
            onSelectAnnotation?.(null);
            onScreenshotModeChange?.(
              true,
            );
            return;
          }
        }

        const stream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: {
                cursor: "always",
              } as any,
              audio: false,
            },
          );

        const track =
          stream.getVideoTracks()[0];
        const imageCapture = new (
          window as any
        ).ImageCapture(track);
        const bitmap =
          await imageCapture.grabFrame();

        const canvas =
          document.createElement(
            "canvas",
          );
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx =
          canvas.getContext("2d");
        ctx?.drawImage(bitmap, 0, 0);

        const dataUrl =
          canvas.toDataURL("image/png");
        onScreenshotChange?.(dataUrl);

        // Stop sharing
        track.stop();

        // Reset state
        onAnnotationsChange?.([]);
        setNextId(1);
        onSelectAnnotation?.(null);
        onScreenshotModeChange?.(true);
      } catch (err) {
        console.error(
          "Error capturing screen:",
          err,
        );
      }
    };

  useEffect(() => {
    if (!elementPickerMode) return;

    // ── Electron path: use executeJs to run picker in the WebContentsView ──
    if (electronBrowserView) {
      setIframeAccessError(
        "Click an element in the preview.",
      );

      // Inject a one-shot click listener via executeJs
      electronBrowserView
        .executeJs(
          `
        new Promise(function(resolve) {
          var prev = document.body.style.cursor;
          document.body.style.cursor = 'crosshair';
          function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('keydown', onKey, true);
            document.body.style.cursor = prev;
            var el = e.target;
            if (!el) { resolve(null); return; }
            var testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-qa');
            var selector;
            if (testId) { selector = '[data-testid="' + testId + '"]'; }
            else if (el.id) { selector = '#' + el.id; }
            else {
              var classList = Array.from(el.classList || []);
              if (classList.length > 0) {
                selector = '.' + classList.slice(0,2).map(function(n){return n.trim();}).filter(Boolean).join('.');
              } else {
                var tag = el.tagName.toLowerCase();
                var parent = el.parentElement;
                if (!parent) { selector = tag; }
                else {
                  var siblings = Array.from(parent.children).filter(function(c){return c.tagName===el.tagName;});
                  selector = siblings.length <= 1 ? tag : tag + ':nth-of-type(' + (siblings.indexOf(el)+1) + ')';
                }
              }
            }
            var text = (el.textContent||'').slice(0,80).trim().replace(/\\s+/g,' ');
            var computed = window.getComputedStyle(el);
            resolve({
              selector: selector,
              tagName: el.tagName.toLowerCase(),
              textSnippet: text,
              styles: {
                color: computed.color || '',
                backgroundColor: computed.backgroundColor || '',
                padding: computed.padding || '',
                fontSize: computed.fontSize || '',
                visibility: computed.visibility || 'visible',
              },
              cssText: el.style ? el.style.cssText : '',
            });
          }
          function onKey(e) {
            if (e.key === 'Escape') {
              document.removeEventListener('click', onClick, true);
              document.removeEventListener('keydown', onKey, true);
              document.body.style.cursor = prev;
              resolve(null);
            }
          }
          document.addEventListener('click', onClick, true);
          document.addEventListener('keydown', onKey, true);
        })
      `,
        )
        .then((result: unknown) => {
          setIframeAccessError(null);
          if (!result) {
            // User cancelled (ESC)
            setElementPickerMode(null);
            return;
          }
          const info = result as {
            selector: string;
            tagName: string;
            textSnippet: string;
            styles: typeof propsDraft;
            cssText: string;
          };
          setSelectedElementInfo({
            selector: info.selector,
            tagName: info.tagName,
            textSnippet:
              info.textSnippet,
          });
          selectedElementRef.current =
            null; // No direct ref in Electron mode
          setPropsDraft(info.styles);
          setCssDraft(info.cssText);
          lastCssTextRef.current =
            info.cssText;

          if (
            elementPickerMode ===
            "prompt"
          ) {
            insertPromptReference(
              info.selector,
            );
          }
          setElementPickerMode(null);
        })
        .catch(() => {
          setIframeAccessError(
            "Element picker failed.",
          );
          setElementPickerMode(null);
        });

      return; // No cleanup needed — the promise handles everything
    }

    // ── Iframe path (non-Electron) ──
    const pickId = `pick-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let isHandlingResponse = false;

    // Try direct DOM access first
    const doc = tryGetIframeDocument();
    if (doc) {
      // Direct access succeeded, use the iframe's DOM
      const hoverOverlay =
        ensureOverlay(doc, "hover");
      const selectedOverlay =
        ensureOverlay(doc, "selected");
      highlightRefs.current.hover =
        hoverOverlay;
      highlightRefs.current.selected =
        selectedOverlay;
      const previousCursor =
        doc.body?.style.cursor || "";
      if (doc.body)
        doc.body.style.cursor =
          "crosshair";

      const handleMouseMove = (
        event: Event,
      ) => {
        const target =
          event.target as Element | null;
        if (!target) return;
        if (
          target.getAttribute?.(
            "data-agelum-overlay",
          )
        )
          return;
        updateOverlayForElement(
          hoverOverlay,
          target,
        );
      };

      const handleClick = (
        event: Event,
      ) => {
        const target =
          event.target as Element | null;
        if (!target) return;
        if (
          target.getAttribute?.(
            "data-agelum-overlay",
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();

        syncElementState(target, doc);
        updateOverlayForElement(
          selectedOverlay,
          target,
        );

        if (
          elementPickerMode === "prompt"
        ) {
          const selector =
            getElementSelector(target);
          insertPromptReference(
            selector,
          );
        }

        setElementPickerMode(null);
      };

      doc.addEventListener(
        "mousemove",
        handleMouseMove,
        true,
      );
      doc.addEventListener(
        "click",
        handleClick,
        true,
      );

      return () => {
        doc.removeEventListener(
          "mousemove",
          handleMouseMove,
          true,
        );
        doc.removeEventListener(
          "click",
          handleClick,
          true,
        );
        updateOverlayForElement(
          hoverOverlay,
          null,
        );
        if (doc.body)
          doc.body.style.cursor =
            previousCursor;
      };
    }

    // Direct access failed, try postMessage + overlay approach for cross-origin iframes
    setIframeAccessError(
      "Using cross-origin element picker. Click an element in the preview.",
    );

    // Create a transparent overlay over the iframe for visual feedback and click capture
    const iframeEl = iframeRef?.current;
    let overlay: HTMLDivElement | null =
      null;
    let responseTimeout: ReturnType<
      typeof setTimeout
    > | null = null;

    const handlePickerMessage = (
      event: MessageEvent,
    ) => {
      const { data } = event;

      if (!data || data.id !== pickId)
        return;

      if (
        data.type ===
          "agelum:pick-response" &&
        data.element
      ) {
        isHandlingResponse = true;
        const elementInfo =
          data.element as ElementSelectionInfo;
        setSelectedElementInfo(
          elementInfo,
        );
        selectedElementRef.current =
          null; // Can't keep ref for cross-origin elements

        if (
          elementPickerMode === "prompt"
        ) {
          insertPromptReference(
            elementInfo.selector,
          );
        }

        setIframeAccessError(null);
        setElementPickerMode(null);
        cleanup();
      } else if (
        data.type ===
        "agelum:pick-cancel"
      ) {
        isHandlingResponse = true;
        setElementPickerMode(null);
        setIframeAccessError(null);
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener(
        "message",
        handlePickerMessage,
      );
      if (
        overlay &&
        overlay.parentNode
      ) {
        overlay.parentNode.removeChild(
          overlay,
        );
      }
      overlay = null;
      if (responseTimeout) {
        clearTimeout(responseTimeout);
        responseTimeout = null;
      }
    };

    if (iframeEl) {
      overlay =
        document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.cursor =
        "crosshair";
      overlay.style.zIndex =
        "2147483646";
      overlay.style.background =
        "rgba(59, 130, 246, 0.05)";
      overlay.style.transition =
        "background 0.15s";

      const positionOverlay = () => {
        if (!iframeEl || !overlay)
          return;
        const rect =
          iframeEl.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
      };

      positionOverlay();

      const handleOverlayClick = (
        e: Event,
      ) => {
        const mouseEvent =
          e as MouseEvent;
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        if (!iframeEl) return;
        const rect =
          iframeEl.getBoundingClientRect();
        const x =
          mouseEvent.clientX -
          rect.left;
        const y =
          mouseEvent.clientY - rect.top;

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
        requestIframeElementPick(
          pickId,
        );

        // Timeout if iframe doesn't respond
        responseTimeout = setTimeout(
          () => {
            if (!isHandlingResponse) {
              setIframeAccessError(
                "No response from the preview. The page may not support element picking.",
              );
              setElementPickerMode(
                null,
              );
              cleanup();
            }
          },
          3000,
        );
      };

      overlay.addEventListener(
        "click",
        handleOverlayClick,
      );
      window.addEventListener(
        "resize",
        positionOverlay,
      );
      window.addEventListener(
        "scroll",
        positionOverlay,
        true,
      );
      document.body.appendChild(
        overlay,
      );

      // Store resize/scroll handlers for cleanup
      const _positionOverlay =
        positionOverlay;

      // Extend cleanup to remove overlay event listeners
      const originalCleanup = cleanup;
      const fullCleanup = () => {
        originalCleanup();
        window.removeEventListener(
          "resize",
          _positionOverlay,
        );
        window.removeEventListener(
          "scroll",
          _positionOverlay,
          true,
        );
      };

      window.addEventListener(
        "message",
        handlePickerMessage,
      );

      return fullCleanup;
    }

    // No iframe element available, just listen for messages
    requestIframeElementPick(pickId);
    window.addEventListener(
      "message",
      handlePickerMessage,
    );

    return cleanup;
  }, [
    elementPickerMode,
    electronBrowserView,
    requestIframeElementPick,
    tryGetIframeDocument,
    insertPromptReference,
    updateOverlayForElement,
    ensureOverlay,
  ]);

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
  }, [
    selectedElementInfo,
    tryGetIframeDocument,
    ensureOverlay,
    updateOverlayForElement,
  ]);

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

  const handlePropValueChange = (
    property: keyof typeof propsDraft,
    value: string,
  ) => {
    setPropsDraft((prev) => ({
      ...prev,
      [property]: value,
    }));

    if (property === "fontSize") {
      const normalized =
        /^\d+(\.\d+)?$/.test(
          value.trim(),
        )
          ? `${value.trim()}px`
          : value;
      applyStyleChange(
        "font-size",
        normalized,
      );
      return;
    }

    if (
      property === "backgroundColor"
    ) {
      applyStyleChange(
        "background-color",
        value,
      );
      return;
    }

    applyStyleChange(property, value);
  };

  const handleCssDraftChange = (
    nextValue: string,
  ) => {
    setCssDraft(nextValue);

    // Electron path: apply cssText via executeJs
    if (
      electronBrowserView &&
      selectedElementInfo
    ) {
      const selector =
        selectedElementInfo.selector;
      const escaped = nextValue
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
      const escapedSel =
        selector.replace(/'/g, "\\'");

      if (cssChangeTimeoutRef.current) {
        window.clearTimeout(
          cssChangeTimeoutRef.current,
        );
      }

      const previous =
        lastCssTextRef.current;
      cssChangeTimeoutRef.current =
        window.setTimeout(() => {
          electronBrowserView.executeJs(`
          (function() {
            var el = document.querySelector('${escapedSel}');
            if (el) el.style.cssText = '${escaped}';
          })()
        `);
          if (previous !== nextValue) {
            recordChange({
              selector,
              property: "style",
              previousValue:
                previous || "(empty)",
              nextValue:
                nextValue || "(empty)",
              source: "css",
            });
          }
          lastCssTextRef.current =
            nextValue;
        }, 700);
      return;
    }

    // Iframe path: direct DOM access
    const element = asHTMLElement(
      selectedElementRef.current,
    );
    if (!element) return;

    const previous =
      lastCssTextRef.current;
    element.style.cssText = nextValue;

    if (cssChangeTimeoutRef.current) {
      window.clearTimeout(
        cssChangeTimeoutRef.current,
      );
    }

    const selector =
      selectedElementInfo?.selector ||
      getElementSelector(element);
    cssChangeTimeoutRef.current =
      window.setTimeout(() => {
        if (previous === nextValue)
          return;
        recordChange({
          selector,
          property: "style",
          previousValue:
            previous || "(empty)",
          nextValue:
            nextValue || "(empty)",
          source: "css",
        });
        lastCssTextRef.current =
          nextValue;
      }, 700);
  };

  const handleDeleteAnnotation = (
    id: number,
  ) => {
    onAnnotationsChange?.(
      annotations.filter(
        (a) => a.id !== id,
      ),
    );
    if (selectedAnnotationId === id)
      onSelectAnnotation?.(null);
  };

  const handleCreateTask = async () => {
    if (!repo) return;
    setIsCreatingTask(true);

    try {
      let imageRelativePath = "";
      if (
        mode === "screen" &&
        screenshot
      ) {
        if (!projectPath) {
          throw new Error(
            "Project path is required to save screenshots.",
          );
        }

        const canvas =
          document.createElement(
            "canvas",
          );
        const img = new Image();
        await new Promise<void>(
          (resolve, reject) => {
            img.onload = () =>
              resolve();
            img.onerror = () =>
              reject(
                new Error(
                  "Failed to load screenshot",
                ),
              );
            img.src = screenshot;
          },
        );

        const naturalWidth =
          img.naturalWidth || img.width;
        const naturalHeight =
          img.naturalHeight ||
          img.height;
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;

        const ctx =
          canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          const displayWidth =
            screenshotDisplaySize?.width ||
            naturalWidth;
          const displayHeight =
            screenshotDisplaySize?.height ||
            naturalHeight;

          const scaleX =
            naturalWidth / displayWidth;
          const scaleY =
            naturalHeight /
            displayHeight;
          const scale =
            Math.min(scaleX, scaleY) ||
            1;

          annotations.forEach((ann) => {
            const mappedX = ann.x * scaleX;
            const mappedY = ann.y * scaleY;
            const mappedWidth = (ann.width || 0) * scaleX;
            const mappedHeight = (ann.height || 0) * scaleY;

            const badgeRadius = Math.max(10, 12 * scale);
            const strokeWidth = Math.max(2, 2 * scale);
            const fontSize = Math.max(10, 10 * scale);

            let mainColor = "#f59e0b";
            let fillColor = "rgba(245, 158, 11, 0.15)";
            let badgeBgColor = "#f97316";

            if (ann.type === "remove") {
              mainColor = "#dc2626";
              fillColor = "rgba(220, 38, 38, 0.15)";
              badgeBgColor = "#dc2626";
            } else if (ann.type === "arrow") {
              mainColor = "#3b82f6";
              fillColor = "transparent";
              badgeBgColor = "#2563eb";
            }

            if (
              ann.type === "arrow" &&
              ann.endX !== undefined &&
              ann.endY !== undefined
            ) {
              const startX = mappedX;
              const startY = mappedY;
              const endX = ann.endX * scaleX;
              const endY = ann.endY * scaleY;

              ctx.strokeStyle = mainColor;
              ctx.lineWidth = strokeWidth * 1.5;
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              const angle = Math.atan2(endY - startY, endX - startX);
              const arrowLength = 12 * scale;
              ctx.fillStyle = mainColor;
              ctx.beginPath();
              ctx.moveTo(endX, endY);
              ctx.lineTo(
                endX - arrowLength * Math.cos(angle - Math.PI / 6),
                endY - arrowLength * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                endX - arrowLength * Math.cos(angle + Math.PI / 6),
                endY - arrowLength * Math.sin(angle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.lineWidth = strokeWidth;
              ctx.strokeStyle = mainColor;
              ctx.fillStyle = fillColor;
              ctx.strokeRect(mappedX, mappedY, mappedWidth, mappedHeight);
              ctx.fillRect(mappedX, mappedY, mappedWidth, mappedHeight);

              if (ann.type === "remove") {
                const label = "REMOVE THIS";
                ctx.font = `bold ${Math.max(8, 9 * scale)}px sans-serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                const labelPadding = 4 * scale;
                const labelWidth = ctx.measureText(label).width + labelPadding * 2;
                const labelHeight = Math.max(12, 14 * scale);
                const labelX = mappedX + 12 * scale;
                const labelY = mappedY - 25 * scale;

                ctx.fillStyle = "#dc2626";
                if (typeof (ctx as any).roundRect === "function") {
                  (ctx as any).beginPath();
                  (ctx as any).roundRect(labelX, labelY, labelWidth, labelHeight, 2 * scale);
                  (ctx as any).fill();
                } else {
                  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
                }
                ctx.fillStyle = "#ffffff";
                ctx.fillText(label, labelX + labelPadding, labelY + labelHeight / 2);
              }
            }

            const badgeX = mappedX;
            const badgeY = mappedY;

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = badgeBgColor;
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius - (2 * scale), 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(ann.id), badgeX, badgeY);
          });
        }

        const compositeDataUrl =
          canvas.toDataURL("image/png");
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

        const saveRes = await fetch(
          "/api/file",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              path: absolutePath,
              content: base64Data,
              encoding: "base64",
            }),
          },
        );
        if (!saveRes.ok) {
          const result =
            await saveRes.json();
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
        taskBody = `Source: Browser Screenshot

`;

        if (generalPrompt) {
          taskBody += `## General Instructions
${generalPrompt}

`;
        }

        if (imageRelativePath) {
          taskBody += `![Screenshot](${imageRelativePath})

`;
        }

        taskBody += `## Annotations

`;
        if (annotations.length === 0) {
          taskBody += `No annotations were added.

`;
        } else {
          annotations.forEach((ann) => {
            const colorName =
              ann.type === "remove"
                ? "red"
                : ann.type === "arrow"
                  ? "blue"
                  : "orange";
            const shapeName =
              ann.type === "arrow"
                ? "arrow"
                : "square";
            const promptValue =
              ann.prompt || "";

            let actionPhrase =
              "we want to do this modification:";
            if (ann.type === "remove") {
              actionPhrase =
                "we need to remove these components.";
            } else if (
              ann.type === "arrow"
            ) {
              actionPhrase =
                "we need to move that.";
            }

            taskBody += `${ann.id}. Where is the ${colorName} ${shapeName} with number ${ann.id} ${actionPhrase} ${promptValue || "No instructions provided."}
`;
          });
          taskBody += `
`;
        }
      } else if (mode === "prompt") {
        taskTitle = `Browser Task - ${new Date().toLocaleString()}`;
        taskBody = promptText;
      } else if (
        mode === "properties"
      ) {
        taskTitle = `Style Tweaks - ${new Date().toLocaleString()}`;
        taskBody = `Source: Browser Properties Editor

`;
        if (selectedElementInfo) {
          taskBody += `Selected Element: \`${selectedElementInfo.selector}\`

`;
        }
        taskBody += `## Changes

`;
        if (changes.length === 0) {
          taskBody += `No changes were recorded.

`;
        } else {
          taskBody += `| # | Selector | Property | From | To |
| - | - | - | - | - |
`;
          changes.forEach(
            (change, index) => {
              const safeSelector =
                change.selector
                  .replace(/\n/g, " ")
                  .replace(
                    /\|/g,
                    "\\|",
                  );
              const safePrev =
                change.previousValue
                  .replace(/\n/g, " ")
                  .replace(
                    /\|/g,
                    "\\|",
                  );
              const safeNext =
                change.nextValue
                  .replace(/\n/g, " ")
                  .replace(
                    /\|/g,
                    "\\|",
                  );
              taskBody += `| ${index + 1} | ${safeSelector} | ${change.property} | ${safePrev} | ${safeNext} |\n`;
            },
          );
          taskBody += `
`;
        }
      }

      const res = await fetch(
        "/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            repo,
            action: "create",
            data: {
              title: taskTitle,
              description: taskBody,
              state: "fixes",
            },
          }),
        },
      );

      if (res.ok) {
        resetScreenState();
        setPromptText("");
        setGeneralPrompt("");
        setSelectedGeneralPrompt(false);
        setChanges([]);
        setSelectedElementInfo(null);
        selectedElementRef.current =
          null;
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
      } else {
        const errData =
          await res.json();
        throw new Error(
          errData.error ||
            "Failed to create task",
        );
      }
    } catch (e) {
      console.error(
        "Error in handleCreateTask:",
        e,
      );
    } finally {
      setIsCreatingTask(false);
    }
  };

  const isModeLocked =
    Boolean(screenshot) ||
    elementPickerMode !== null;
  const lockMessage = screenshot
    ? "Finish or cancel the screenshot to switch modes."
    : elementPickerMode
      ? "Exit element selection to switch modes."
      : null;
  const isTabDisabled = (
    nextMode: Mode,
  ) =>
    nextMode !== mode && isModeLocked;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Internal Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() =>
            setMode("screen")
          }
          disabled={isTabDisabled(
            "screen",
          )}
          className={`flex-1 py-2 text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "screen" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Screen
        </button>
        <button
          onClick={() =>
            setMode("properties")
          }
          disabled={isTabDisabled(
            "properties",
          )}
          className={`flex-1 py-2 text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "properties" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Properties
        </button>
        <button
          onClick={() =>
            setMode("prompt")
          }
          disabled={isTabDisabled(
            "prompt",
          )}
          className={`flex-1 py-2 text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "prompt" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Prompt
        </button>
      </div>
      {lockMessage && (
        <div className="px-4 py-2 text-[10px] text-muted-foreground border-b border-border bg-secondary/20">
          {lockMessage}
        </div>
      )}

      <div className="overflow-auto flex-1 p-4 space-y-4">
        {mode === "screen" && (
          <div className="flex flex-col h-full">
            {!screenshot ? (
              <div className="flex flex-col justify-center items-center h-64 rounded-lg border-2 border-dashed border-border bg-secondary/20">
                <button
                  onClick={
                    handleCaptureScreen
                  }
                  className="flex flex-col gap-2 items-center transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">
                    Capture Screen
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`border rounded-lg transition-all cursor-pointer ${
                    selectedGeneralPrompt
                      ? "shadow-sm border-primary bg-secondary/30"
                      : "border-border bg-secondary/10 hover:bg-secondary/20"
                  }`}
                  onClick={() => {
                    setSelectedGeneralPrompt(
                      !selectedGeneralPrompt,
                    );
                    onSelectAnnotation?.(
                      null,
                    );
                  }}
                >
                  <div className="flex gap-2 items-center p-2">
                    <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold bg-muted-foreground/30 text-foreground border-2 border-white/20">
                      G
                    </div>
                    <div className="flex-1 min-w-0">
                      {!selectedGeneralPrompt && (
                        <p
                          className={`text-[11px] truncate ${generalPrompt ? "text-foreground" : "italic text-muted-foreground"}`}
                        >
                          {generalPrompt ||
                            "General instructions (optional)..."}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedGeneralPrompt && (
                    <div className="px-2 pt-1 pb-2 border-t border-border/50">
                      <textarea
                        autoFocus
                        className="p-2 w-full text-xs rounded border resize-none border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Add general instructions for this task..."
                        value={
                          generalPrompt
                        }
                        onChange={(e) =>
                          setGeneralPrompt(
                            e.target
                              .value,
                          )
                        }
                        rows={3}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      />
                    </div>
                  )}
                </div>

                <AnnotationPromptList
                  annotations={
                    annotations
                  }
                  selectedAnnotationId={
                    selectedAnnotationId
                  }
                  onSelectAnnotation={(
                    id,
                  ) => {
                    onSelectAnnotation?.(
                      id,
                    );
                    if (id !== null)
                      setSelectedGeneralPrompt(
                        false,
                      );
                  }}
                  onUpdatePrompt={(
                    id,
                    prompt,
                  ) => {
                    onAnnotationsChange?.(
                      annotations.map(
                        (a) =>
                          a.id === id
                            ? {
                                ...a,
                                prompt,
                              }
                            : a,
                      ),
                    );
                  }}
                  onDeleteAnnotation={
                    handleDeleteAnnotation
                  }
                />
              </div>
            )}
          </div>
        )}

        {mode === "properties" && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <button
                onClick={() =>
                  toggleElementPicker(
                    "properties",
                  )
                }
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded border ${
                  elementPickerMode ===
                  "properties"
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                <MousePointer2 className="w-3 h-3" />
                {elementPickerMode ===
                "properties"
                  ? "Click an element..."
                  : "Pick Element"}
              </button>
              {selectedElementInfo && (
                <button
                  onClick={() => {
                    setSelectedElementInfo(
                      null,
                    );
                    selectedElementRef.current =
                      null;
                    updateOverlayForElement(
                      highlightRefs
                        .current
                        .selected,
                      null,
                    );
                    setPropsDraft({
                      color: "",
                      backgroundColor:
                        "",
                      padding: "",
                      fontSize: "",
                      visibility:
                        "visible",
                    });
                    setCssDraft("");
                    lastCssTextRef.current =
                      "";
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
              <div className="p-2 space-y-1 text-xs rounded border border-border bg-secondary/20">
                <div className="font-medium text-foreground">
                  {
                    selectedElementInfo.selector
                  }
                </div>
                <div className="text-muted-foreground">
                  {
                    selectedElementInfo.tagName
                  }
                  {selectedElementInfo.textSnippet
                    ? ` · ${selectedElementInfo.textSnippet}`
                    : ""}
                </div>
              </div>
            ) : (
              <div className="p-3 text-xs rounded border border-border bg-secondary/10 text-muted-foreground">
                Pick an element in the
                preview to start editing
                styles.
              </div>
            )}

            <div className="flex border-b border-border">
              <button
                onClick={() =>
                  setPropertiesTab(
                    "props",
                  )
                }
                className={`flex-1 text-xs py-1 border-b-2 ${
                  propertiesTab ===
                  "props"
                    ? "border-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <Settings className="inline mr-1 w-3 h-3" />
                Props
              </button>
              <button
                onClick={() =>
                  setPropertiesTab(
                    "css",
                  )
                }
                className={`flex-1 text-xs py-1 border-b-2 ${
                  propertiesTab ===
                  "css"
                    ? "border-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <Code className="inline mr-1 w-3 h-3" />
                CSS
              </button>
              <button
                onClick={() =>
                  setPropertiesTab(
                    "changes",
                  )
                }
                className={`flex-1 text-xs py-1 border-b-2 ${
                  propertiesTab ===
                  "changes"
                    ? "border-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <History className="inline mr-1 w-3 h-3" />
                Changes
              </button>
            </div>

            {propertiesTab ===
              "props" && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px]">
                    Text Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        rgbToHex(
                          propsDraft.color,
                        ) || "#000000"
                      }
                      onChange={(e) =>
                        handlePropValueChange(
                          "color",
                          e.target
                            .value,
                        )
                      }
                      disabled={
                        !selectedElementInfo
                      }
                      className="w-10 h-7 rounded border border-border"
                    />
                    <input
                      type="text"
                      value={
                        propsDraft.color
                      }
                      onChange={(e) =>
                        handlePropValueChange(
                          "color",
                          e.target
                            .value,
                        )
                      }
                      disabled={
                        !selectedElementInfo
                      }
                      className="flex-1 px-2 py-1 rounded border border-border bg-background text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px]">
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
                          e.target
                            .value,
                        )
                      }
                      disabled={
                        !selectedElementInfo
                      }
                      className="w-10 h-7 rounded border border-border"
                    />
                    <input
                      type="text"
                      value={
                        propsDraft.backgroundColor
                      }
                      onChange={(e) =>
                        handlePropValueChange(
                          "backgroundColor",
                          e.target
                            .value,
                        )
                      }
                      disabled={
                        !selectedElementInfo
                      }
                      className="flex-1 px-2 py-1 rounded border border-border bg-background text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px]">
                    Padding
                  </label>
                  <input
                    type="text"
                    value={
                      propsDraft.padding
                    }
                    onChange={(e) =>
                      handlePropValueChange(
                        "padding",
                        e.target.value,
                      )
                    }
                    disabled={
                      !selectedElementInfo
                    }
                    className="px-2 py-1 w-full rounded border border-border bg-background text-[11px]"
                    placeholder="e.g. 12px 16px"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px]">
                    Font Size
                  </label>
                  <input
                    type="text"
                    value={
                      propsDraft.fontSize
                    }
                    onChange={(e) =>
                      handlePropValueChange(
                        "fontSize",
                        e.target.value,
                      )
                    }
                    disabled={
                      !selectedElementInfo
                    }
                    className="px-2 py-1 w-full rounded border border-border bg-background text-[11px]"
                    placeholder="e.g. 16px"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px]">
                    Visibility
                  </label>
                  <select
                    value={
                      propsDraft.visibility
                    }
                    onChange={(e) =>
                      handlePropValueChange(
                        "visibility",
                        e.target.value,
                      )
                    }
                    disabled={
                      !selectedElementInfo
                    }
                    className="px-2 py-1 w-full rounded border border-border bg-background text-[11px]"
                  >
                    <option value="visible">
                      visible
                    </option>
                    <option value="hidden">
                      hidden
                    </option>
                    <option value="collapse">
                      collapse
                    </option>
                  </select>
                </div>
              </div>
            )}

            {propertiesTab ===
              "css" && (
              <div className="space-y-2">
                {selectedElementInfo ? (
                  <MonacoEditor
                    height="180px"
                    language="css"
                    theme="vs-dark"
                    value={cssDraft}
                    onChange={(value) =>
                      handleCssDraftChange(
                        value || "",
                      )
                    }
                    options={{
                      minimap: {
                        enabled: false,
                      },
                      lineNumbers:
                        "off",
                      fontSize: 11,
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                    }}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Select an element to
                    edit its inline
                    styles.
                  </div>
                )}
              </div>
            )}

            {propertiesTab ===
              "changes" && (
              <div className="space-y-2">
                {changes.length ===
                0 ? (
                  <div className="text-xs text-muted-foreground">
                    Changes will appear
                    here as you tweak
                    styles.
                  </div>
                ) : (
                  <div className="overflow-auto pr-1 space-y-2 max-h-48">
                    {changes.map(
                      (change) => (
                        <div
                          key={
                            change.id
                          }
                          className="p-2 space-y-1 text-xs rounded border border-border bg-secondary/10"
                        >
                          <div className="font-medium text-foreground">
                            {
                              change.property
                            }
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            {
                              change.selector
                            }
                          </div>
                          <div className="text-[11px]">
                            <span className="text-muted-foreground">
                              {
                                change.previousValue
                              }{" "}
                              →{" "}
                            </span>
                            <span>
                              {
                                change.nextValue
                              }
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "prompt" && (
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex gap-2 items-center">
              <button
                onClick={() =>
                  toggleElementPicker(
                    "prompt",
                  )
                }
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded border ${
                  elementPickerMode ===
                  "prompt"
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                <MousePointer2 className="w-3 h-3" />
                {elementPickerMode ===
                "prompt"
                  ? "Click an element..."
                  : "Insert Element Ref"}
              </button>
              {selectedElementInfo && (
                <div className="text-[10px] text-muted-foreground">
                  Last:{" "}
                  <span className="font-medium text-foreground">
                    {
                      selectedElementInfo.selector
                    }
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
              className="flex-1 p-3 w-full text-sm rounded border resize-none border-border bg-background focus:outline-none focus:ring-1"
              placeholder="Describe the task referencing elements..."
              value={promptText}
              onChange={(e) =>
                setPromptText(
                  e.target.value,
                )
              }
            />
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-border bg-secondary/10">
        <button
          onClick={handleCreateTask}
          disabled={
            isCreatingTask ||
            (mode === "screen" &&
              !screenshot) ||
            (mode === "prompt" &&
              !promptText)
          }
          className="flex gap-2 justify-center items-center py-2 w-full text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingTask
            ? "Creating..."
            : "Create Task"}
          {!isCreatingTask && (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
