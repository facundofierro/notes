import React from "react";
import { MousePointer2, Settings, Code as CodeIcon, History } from "lucide-react";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";
import { ElementSelectionInfo, ChangeEntry } from "./types";
import { rgbToHex } from "./utils";

const MonacoEditor = dynamic<EditorProps>(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false },
);

interface TaskPanelPropertiesProps {
  elementPickerMode: "properties" | "prompt" | null;
  toggleElementPicker: (target: "properties" | "prompt") => void;
  selectedElementInfo: ElementSelectionInfo | null;
  setSelectedElementInfo: (info: ElementSelectionInfo | null) => void;
  selectedElementRef: React.MutableRefObject<Element | null>;
  highlightRefs: React.MutableRefObject<{
    hover?: HTMLDivElement | null;
    selected?: HTMLDivElement | null;
  }>;
  updateOverlayForElement: (overlay: HTMLDivElement | null | undefined, element: Element | null) => void;
  iframeAccessError: string | null;
  propertiesTab: "props" | "css" | "changes";
  setPropertiesTab: (tab: "props" | "css" | "changes") => void;
  propsDraft: {
    color: string;
    backgroundColor: string;
    padding: string;
    fontSize: string;
    visibility: string;
  };
  setPropsDraft: React.Dispatch<React.SetStateAction<{
    color: string;
    backgroundColor: string;
    padding: string;
    fontSize: string;
    visibility: string;
  }>>;
  setCssDraft: (css: string) => void;
  cssDraft: string;
  lastCssTextRef: React.MutableRefObject<string>;
  changes: ChangeEntry[];
  handlePropValueChange: (property: keyof TaskPanelPropertiesProps["propsDraft"], value: string) => void;
  handleCssDraftChange: (value: string) => void;
}

export function TaskPanelProperties({
  elementPickerMode,
  toggleElementPicker,
  selectedElementInfo,
  setSelectedElementInfo,
  selectedElementRef,
  highlightRefs,
  updateOverlayForElement,
  iframeAccessError,
  propertiesTab,
  setPropertiesTab,
  propsDraft,
  setPropsDraft,
  setCssDraft,
  cssDraft,
  lastCssTextRef,
  changes,
  handlePropValueChange,
  handleCssDraftChange,
}: TaskPanelPropertiesProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
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
        <div className="text-xs text-red-500">{iframeAccessError}</div>
      )}

      {selectedElementInfo ? (
        <div className="p-2 space-y-1 text-xs rounded border border-border bg-secondary/20">
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
        <div className="p-3 text-xs rounded border border-border bg-secondary/10 text-muted-foreground">
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
          <Settings className="inline mr-1 w-3 h-3" />
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
          <CodeIcon className="inline mr-1 w-3 h-3" />
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
          <History className="inline mr-1 w-3 h-3" />
          Changes
        </button>
      </div>

      {propertiesTab === "props" && (
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px]">
              Text Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={rgbToHex(propsDraft.color) || "#000000"}
                onChange={(e) =>
                  handlePropValueChange("color", e.target.value)
                }
                disabled={!selectedElementInfo}
                className="w-10 h-7 rounded border border-border"
              />
              <input
                type="text"
                value={propsDraft.color}
                onChange={(e) =>
                  handlePropValueChange("color", e.target.value)
                }
                disabled={!selectedElementInfo}
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
                value={rgbToHex(propsDraft.backgroundColor) || "#ffffff"}
                onChange={(e) =>
                  handlePropValueChange("backgroundColor", e.target.value)
                }
                disabled={!selectedElementInfo}
                className="w-10 h-7 rounded border border-border"
              />
              <input
                type="text"
                value={propsDraft.backgroundColor}
                onChange={(e) =>
                  handlePropValueChange("backgroundColor", e.target.value)
                }
                disabled={!selectedElementInfo}
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
              value={propsDraft.padding}
              onChange={(e) =>
                handlePropValueChange("padding", e.target.value)
              }
              disabled={!selectedElementInfo}
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
              value={propsDraft.fontSize}
              onChange={(e) =>
                handlePropValueChange("fontSize", e.target.value)
              }
              disabled={!selectedElementInfo}
              className="px-2 py-1 w-full rounded border border-border bg-background text-[11px]"
              placeholder="e.g. 16px"
            />
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px]">
              Visibility
            </label>
            <select
              value={propsDraft.visibility}
              onChange={(e) =>
                handlePropValueChange("visibility", e.target.value)
              }
              disabled={!selectedElementInfo}
              className="px-2 py-1 w-full rounded border border-border bg-background text-[11px]"
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
              onChange={(value) => handleCssDraftChange(value || "")}
              options={{
                minimap: {
                  enabled: false,
                },
                lineNumbers: "off",
                fontSize: 11,
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
            <div className="overflow-auto pr-1 space-y-2 max-h-48">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="p-2 space-y-1 text-xs rounded border border-border bg-secondary/10"
                >
                  <div className="font-medium text-foreground">
                    {change.property}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    {change.selector}
                  </div>
                  <div className="text-[11px]">
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
  );
}
