import React, { useState, useRef, useEffect, useCallback } from "react";
import { ElementSelectionInfo, ChangeEntry } from "./types";
import { getElementSelector, asHTMLElement } from "./utils";

interface UseElementPickerProps {
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  electronBrowserView?: ElectronBrowserViewAPI;
  setIframeAccessError: (error: string | null) => void;
  syncElementState: (element: Element, doc: Document) => void;
  insertPromptReference: (reference: string) => void;
  elementPickerMode: "properties" | "prompt" | null;
  setElementPickerMode: (mode: "properties" | "prompt" | null) => void;
  setSelectedElementInfo: (info: ElementSelectionInfo | null) => void;
  setPropsDraft: (props: any) => void;
  setCssDraft: (css: string) => void;
  lastCssTextRef: React.MutableRefObject<string>;
}

export function useElementPicker({
  iframeRef,
  electronBrowserView,
  setIframeAccessError,
  syncElementState,
  insertPromptReference,
  elementPickerMode,
  setElementPickerMode,
  setSelectedElementInfo,
  setPropsDraft,
  setCssDraft,
  lastCssTextRef,
}: UseElementPickerProps) {
  const highlightRefs = useRef<{
    hover?: HTMLDivElement | null;
    selected?: HTMLDivElement | null;
  }>({});

  const tryGetIframeDocument = useCallback(() => {
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
  }, [iframeRef, setIframeAccessError]);

  const ensureOverlay = useCallback(
    (doc: Document, kind: "hover" | "selected") => {
      const id =
        kind === "hover" ? "agelum-hover-overlay" : "agelum-selected-overlay";
      const existing = doc.getElementById(id) as HTMLDivElement | null;
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
      const mountPoint = doc.body || doc.documentElement;
      if (mountPoint) {
        mountPoint.appendChild(overlay);
      }
      return overlay;
    },
    [],
  );

  const updateOverlayForElement = useCallback(
    (overlay: HTMLDivElement | null | undefined, element: Element | null) => {
      if (!overlay) return;
      if (
        !element ||
        typeof (element as Element).getBoundingClientRect !== "function"
      ) {
        overlay.style.display = "none";
        return;
      }
      const rect = (element as Element).getBoundingClientRect();
      if (!rect.width || !rect.height) {
        overlay.style.display = "none";
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

  const requestIframeElementPick = useCallback(
    (pickId: string) => {
      if (!iframeRef?.current?.contentWindow) {
        setIframeAccessError(
          "Unable to access iframe. Try reloading the page.",
        );
        return;
      }

      iframeRef.current.contentWindow.postMessage(
        {
          type: "agelum:pick-request",
          id: pickId,
        },
        "*",
      );
    },
    [iframeRef, setIframeAccessError],
  );

  useEffect(() => {
    if (!elementPickerMode) return;

    if (electronBrowserView) {
      setIframeAccessError("Click an element in the preview.");

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
            setElementPickerMode(null);
            return;
          }
          const info = result as {
            selector: string;
            tagName: string;
            textSnippet: string;
            styles: any;
            cssText: string;
          };
          setSelectedElementInfo(info);
          setPropsDraft(info.styles);
          setCssDraft(info.cssText);
          lastCssTextRef.current = info.cssText;

          if (elementPickerMode === "prompt") {
            insertPromptReference(info.selector);
          }
          setElementPickerMode(null);
        })
        .catch(() => {
          setIframeAccessError("Element picker failed.");
          setElementPickerMode(null);
        });

      return;
    }

    const pickId = `pick-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let isHandlingResponse = false;

    const doc = tryGetIframeDocument();
    if (doc) {
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
        doc.removeEventListener("mousemove", handleMouseMove, true);
        doc.removeEventListener("click", handleClick, true);
        updateOverlayForElement(hoverOverlay, null);
        if (doc.body) doc.body.style.cursor = previousCursor;
      };
    }

    setIframeAccessError(
      "Using cross-origin element picker. Click an element in the preview.",
    );

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

        iframeEl.contentWindow?.postMessage(
          {
            type: "agelum:pick-at-point",
            id: pickId,
            x,
            y,
          },
          "*",
        );

        requestIframeElementPick(pickId);

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

      window.addEventListener("message", handlePickerMessage);

      return () => {
        cleanup();
        window.removeEventListener("resize", positionOverlay);
        window.removeEventListener("scroll", positionOverlay, true);
      };
    }
  }, [elementPickerMode, electronBrowserView, iframeRef, setIframeAccessError, tryGetIframeDocument, ensureOverlay, updateOverlayForElement, syncElementState, insertPromptReference, setElementPickerMode, setSelectedElementInfo, setPropsDraft, setCssDraft, lastCssTextRef, requestIframeElementPick]);

  return { highlightRefs, updateOverlayForElement, tryGetIframeDocument, ensureOverlay };
}
