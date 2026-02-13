import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
} from "lucide-react";
import { AnnotationPromptList } from "@/components/features/work/AnnotationPromptList";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";
import { Annotation, AnnotationType } from "@/types/entities";
import { burnAnnotations } from "@agelum/annotation";
import { getTimestampPrefix } from "@/lib/date-utils";
import { PanelProps, Mode, ChangeEntry, ElementSelectionInfo } from "./types";
import {
  joinFsPath,
  rgbToHex,
  getElementSelector,
  asHTMLElement,
} from "./utils";
import { TaskPanelScreen } from "./TaskPanelScreen";
import { TaskPanelProperties } from "./TaskPanelProperties";
import { TaskPanelPrompt } from "./TaskPanelPrompt";
import { useElementPicker } from "./useElementPicker";

const MonacoEditor = dynamic<EditorProps>(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false },
);

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
  currentUrl,
}: PanelProps) {
  const [mode, setMode] = useState<Mode>("screen");

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [nextId, setNextId] = useState(1);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);

  // Ref for the image container to calculate relative coordinates
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Prompt mode state
  const [promptText, setPromptText] = useState("");
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [generalPrompt, setGeneralPrompt] = useState("");
  const [selectedGeneralPrompt, setSelectedGeneralPrompt] = useState(false);

  // Element selection / properties mode state
  const [elementPickerMode, setElementPickerMode] = useState<
    "properties" | "prompt" | null
  >(null);
  const [iframeAccessError, setIframeAccessError] = useState<string | null>(
    null,
  );
  const [selectedElementInfo, setSelectedElementInfo] =
    useState<ElementSelectionInfo | null>(null);
  const selectedElementRef = useRef<Element | null>(null);
  const [propertiesTab, setPropertiesTab] = useState<
    "props" | "css" | "changes"
  >("props");
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

  // Task creation state
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [initialScreenshotPath, setInitialScreenshotPath] = useState<
    string | null
  >(null);

  const resetScreenState = () => {
    onScreenshotChange?.(null);
    onAnnotationsChange?.([]);
    onToolSelect?.("modify");
    onSelectAnnotation?.(null);
    setNextId(1);
    setIsDrawing(false);
    setStartPos({ x: 0, y: 0 });
    onScreenshotModeChange?.(false);
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

  const syncElementState = (element: Element, doc: Document) => {
    const selector = getElementSelector(element);
    const textSnippet = (element.textContent || "").trim().slice(0, 80);
    setSelectedElementInfo({
      selector,
      tagName: element.tagName.toLowerCase(),
      textSnippet,
    });
    selectedElementRef.current = element;

    const htmlElement = asHTMLElement(element);
    if (htmlElement) {
      const computed = doc.defaultView?.getComputedStyle(htmlElement);
      setPropsDraft({
        color: computed?.color || "",
        backgroundColor: computed?.backgroundColor || "",
        padding: computed?.padding || "",
        fontSize: computed?.fontSize || "",
        visibility: computed?.visibility || "visible",
      });
      const styleText =
        htmlElement.getAttribute("style") || htmlElement.style.cssText || "";
      setCssDraft(styleText);
      lastCssTextRef.current = styleText;
    }
  };

  const insertPromptReference = React.useCallback((reference: string) => {
    const textarea = promptTextareaRef.current;
    const start = textarea?.selectionStart ?? null;
    const end = textarea?.selectionEnd ?? start;
    setPromptText((prev) => {
      const resolvedStart = start ?? prev.length;
      const resolvedEnd = end ?? resolvedStart;
      return prev.slice(0, resolvedStart) + reference + prev.slice(resolvedEnd);
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

  const {
    highlightRefs,
    updateOverlayForElement,
    tryGetIframeDocument,
    ensureOverlay,
  } = useElementPicker({
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
  });

  const toggleElementPicker = (target: "properties" | "prompt") => {
    if (elementPickerMode === target) {
      setElementPickerMode(null);
      return;
    }
    setElementPickerMode(target);
  };

  const applyStyleChange = (property: string, nextValue: string) => {
    // Electron path: apply style via executeJs
    if (electronBrowserView && selectedElementInfo) {
      const selector = selectedElementInfo.selector;
      const trimmed = nextValue.trim();
      const escapedProp = property.replace(/'/g, "\\'");
      const escapedVal = trimmed.replace(/'/g, "\\'");
      const escapedSel = selector.replace(/'/g, "\\'");
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
          if (res && res.prev !== res.updated) {
            recordChange({
              selector,
              property,
              previousValue: res.prev || "(not set)",
              nextValue: res.updated || "(cleared)",
              source: "props",
            });
          }
          if (res) {
            setCssDraft(res.cssText || "");
            lastCssTextRef.current = res.cssText || "";
          }
        });
      return;
    }

    // Iframe path: direct DOM access
    const element = asHTMLElement(selectedElementRef.current);
    if (!element) return;

    const prevValue = element.style.getPropertyValue(property);
    const trimmed = nextValue.trim();
    if (!trimmed) {
      element.style.removeProperty(property);
    } else {
      element.style.setProperty(property, trimmed);
    }
    const updatedValue = element.style.getPropertyValue(property);

    if (prevValue !== updatedValue) {
      recordChange({
        selector: selectedElementInfo?.selector || getElementSelector(element),
        property,
        previousValue: prevValue || "(not set)",
        nextValue: updatedValue || "(cleared)",
        source: "props",
      });
    }

    const styleText =
      element.getAttribute("style") || element.style.cssText || "";
    setCssDraft(styleText);
    lastCssTextRef.current = styleText;
  };

  const handleCaptureScreen = async () => {
    try {
      if (onRequestCapture) {
        const directCapture = await onRequestCapture();
        if (directCapture) {
          onScreenshotChange?.(directCapture);

          // Save initial screenshot to disk
          if (projectPath) {
            const prefix = getTimestampPrefix();
            const fileName = `${prefix}-screenshot.png`;
            const absolutePath = joinFsPath(
              projectPath,
              ".agelum",
              "work",
              "tasks",
              "images",
              fileName,
            );
            const base64Data = directCapture.replace(
              /^data:image\/\w+;base64,/,
              "",
            );
            await fetch("/api/file", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                path: absolutePath,
                content: base64Data,
                encoding: "base64",
              }),
            });
            setInitialScreenshotPath(absolutePath);
          }

          onAnnotationsChange?.([]);
          setNextId(1);
          onSelectAnnotation?.(null);
          onScreenshotModeChange?.(true);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        } as any,
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(bitmap, 0, 0);

      const dataUrl = canvas.toDataURL("image/png");
      onScreenshotChange?.(dataUrl);

      // Save initial screenshot to disk
      if (projectPath) {
        const prefix = getTimestampPrefix();
        const fileName = `${prefix}-screenshot.png`;
        const absolutePath = joinFsPath(
          projectPath,
          ".agelum",
          "work",
          "tasks",
          "images",
          fileName,
        );
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        await fetch("/api/file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: absolutePath,
            content: base64Data,
            encoding: "base64",
          }),
        });
        setInitialScreenshotPath(absolutePath);
      }

      // Stop sharing
      track.stop();

      // Reset state
      onAnnotationsChange?.([]);
      setNextId(1);
      onSelectAnnotation?.(null);
      onScreenshotModeChange?.(true);
    } catch (err) {
      console.error("Error capturing screen:", err);
    }
  };

  useEffect(() => {
    if (!selectedElementInfo) {
      updateOverlayForElement(highlightRefs.current.selected, null);
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
    highlightRefs,
  ]);

  useEffect(() => {
    return () => {
      if (cssChangeTimeoutRef.current) {
        window.clearTimeout(cssChangeTimeoutRef.current);
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
      const normalized = /^\d+(\.\d+)?$/.test(value.trim())
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

    // Electron path: apply cssText via executeJs
    if (electronBrowserView && selectedElementInfo) {
      const selector = selectedElementInfo.selector;
      const escaped = nextValue.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const escapedSel = selector.replace(/'/g, "\\'");

      if (cssChangeTimeoutRef.current) {
        window.clearTimeout(cssChangeTimeoutRef.current);
      }

      const previous = lastCssTextRef.current;
      cssChangeTimeoutRef.current = window.setTimeout(() => {
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
            previousValue: previous || "(empty)",
            nextValue: nextValue || "(empty)",
            source: "css",
          });
        }
        lastCssTextRef.current = nextValue;
      }, 700);
      return;
    }

    // Iframe path: direct DOM access
    const element = asHTMLElement(selectedElementRef.current);
    if (!element) return;

    const previous = lastCssTextRef.current;
    element.style.cssText = nextValue;

    if (cssChangeTimeoutRef.current) {
      window.clearTimeout(cssChangeTimeoutRef.current);
    }

    const selector =
      selectedElementInfo?.selector || getElementSelector(element);
    cssChangeTimeoutRef.current = window.setTimeout(() => {
      if (previous === nextValue) return;
      recordChange({
        selector,
        property: "style",
        previousValue: previous || "(empty)",
        nextValue: nextValue || "(empty)",
        source: "css",
      });
      lastCssTextRef.current = nextValue;
    }, 700);
  };

  const handleDeleteAnnotation = (id: number) => {
    onAnnotationsChange?.(annotations.filter((a) => a.id !== id));
    if (selectedAnnotationId === id) onSelectAnnotation?.(null);
  };

  const handleCreateTask = async () => {
    if (!repo) return;
    setIsCreatingTask(true);

    try {
      let imageRelativePath = "";
      if (mode === "screen" && screenshot) {
        if (!projectPath) {
          throw new Error("Project path is required to save screenshots.");
        }

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load screenshot"));
          img.src = screenshot;
        });

        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        const compositeDataUrl = await burnAnnotations({
          screenshotDataUrl: screenshot,
          annotations,
          displayWidth: screenshotDisplaySize?.width || naturalWidth,
          displayHeight: screenshotDisplaySize?.height || naturalHeight,
        });
        const base64Data = compositeDataUrl.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const prefix = getTimestampPrefix();
        const safeTitle = "UI-Fixes";
        const fileName = `${prefix}-${safeTitle}.png`;
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: absolutePath,
            content: base64Data,
            encoding: "base64",
          }),
        });
        if (!saveRes.ok) {
          const result = await saveRes.json();
          throw new Error(result?.error || "Failed to save screenshot");
        }

        // Delete initial screenshot if it exists
        if (initialScreenshotPath) {
          try {
            await fetch(
              `/api/file?path=${encodeURIComponent(initialScreenshotPath)}`,
              {
                method: "DELETE",
              },
            );
          } catch (err) {
            console.warn("Failed to delete initial screenshot:", err);
          }
        }

        imageRelativePath = `../images/${fileName}`;
      }

      let taskTitle = "";
      let taskBody = "";

      if (mode === "screen") {
        taskTitle = `UI Fixes`;
        taskBody = `Source: Browser Screenshot
URL: ${currentUrl || "N/A"}

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
            const shapeName = ann.type === "arrow" ? "arrow" : "square";
            const promptValue = ann.prompt || "";

            let actionPhrase = "we want to do this modification:";
            if (ann.type === "remove") {
              actionPhrase = "remove these components.";
            } else if (ann.type === "arrow") {
              actionPhrase = "we need to move that.";
            }

            taskBody += `${ann.id}. Analize the image above and where is the ${colorName} ${shapeName} with number ${ann.id} ${actionPhrase} ${promptValue || ""}
`;
          });
          taskBody += `
`;
        }
      } else if (mode === "prompt") {
        taskTitle = `Browser Task`;
        taskBody = `URL: ${currentUrl || "N/A"}\n\n${promptText}`;
      } else if (mode === "properties") {
        taskTitle = `Style Tweaks`;
        taskBody = `Source: Browser Properties Editor
URL: ${currentUrl || "N/A"}

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
          taskBody += `
`;
        }
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      });

      if (res.ok) {
        resetScreenState();
        setPromptText("");
        setGeneralPrompt("");
        setSelectedGeneralPrompt(false);
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
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create task");
      }
    } catch (e) {
      console.error("Error in handleCreateTask:", e);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const isModeLocked = Boolean(screenshot) || elementPickerMode !== null;
  const lockMessage = screenshot
    ? "Finish or cancel the screenshot to switch modes."
    : elementPickerMode
      ? "Exit element selection to switch modes."
      : null;
  const isTabDisabled = (nextMode: Mode) => nextMode !== mode && isModeLocked;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Internal Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setMode("screen")}
          disabled={isTabDisabled("screen")}
          className={`flex-1 py-2 text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "screen" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Screen
        </button>
        <button
          onClick={() => setMode("properties")}
          disabled={isTabDisabled("properties")}
          className={`flex-1 py-2 text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${mode === "properties" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Properties
        </button>
        <button
          onClick={() => setMode("prompt")}
          disabled={isTabDisabled("prompt")}
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
          <TaskPanelScreen
            screenshot={screenshot || null}
            handleCaptureScreen={handleCaptureScreen}
            selectedGeneralPrompt={selectedGeneralPrompt}
            setSelectedGeneralPrompt={setSelectedGeneralPrompt}
            generalPrompt={generalPrompt}
            setGeneralPrompt={setGeneralPrompt}
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId ?? null}
            onSelectAnnotation={(id) => onSelectAnnotation?.(id)}
            onAnnotationsChange={(ann) => onAnnotationsChange?.(ann)}
            handleDeleteAnnotation={handleDeleteAnnotation}
          />
        )}

        {mode === "properties" && (
          <TaskPanelProperties
            elementPickerMode={elementPickerMode}
            toggleElementPicker={toggleElementPicker}
            selectedElementInfo={selectedElementInfo}
            setSelectedElementInfo={setSelectedElementInfo}
            selectedElementRef={selectedElementRef}
            highlightRefs={highlightRefs}
            updateOverlayForElement={updateOverlayForElement}
            iframeAccessError={iframeAccessError}
            propertiesTab={propertiesTab}
            setPropertiesTab={setPropertiesTab}
            propsDraft={propsDraft}
            setPropsDraft={setPropsDraft}
            setCssDraft={setCssDraft}
            cssDraft={cssDraft}
            lastCssTextRef={lastCssTextRef}
            changes={changes}
            handlePropValueChange={handlePropValueChange}
            handleCssDraftChange={handleCssDraftChange}
          />
        )}

        {mode === "prompt" && (
          <TaskPanelPrompt
            elementPickerMode={elementPickerMode}
            toggleElementPicker={toggleElementPicker}
            selectedElementInfo={selectedElementInfo}
            iframeAccessError={iframeAccessError}
            promptTextareaRef={promptTextareaRef}
            promptText={promptText}
            setPromptText={setPromptText}
          />
        )}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-border bg-secondary/10">
        <button
          onClick={handleCreateTask}
          disabled={
            isCreatingTask ||
            (mode === "screen" && !screenshot) ||
            (mode === "prompt" && !promptText)
          }
          className="flex gap-2 justify-center items-center py-2 w-full text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingTask ? "Creating..." : "Create Task"}
          {!isCreatingTask && <CheckCircle2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
