import React from "react";
import { MousePointer2 } from "lucide-react";
import { ElementSelectionInfo } from "./types";

interface TaskPanelPromptProps {
  elementPickerMode: "properties" | "prompt" | null;
  toggleElementPicker: (target: "properties" | "prompt") => void;
  selectedElementInfo: ElementSelectionInfo | null;
  iframeAccessError: string | null;
  promptTextareaRef: React.RefObject<HTMLTextAreaElement>;
  promptText: string;
  setPromptText: (text: string) => void;
}

export function TaskPanelPrompt({
  elementPickerMode,
  toggleElementPicker,
  selectedElementInfo,
  iframeAccessError,
  promptTextareaRef,
  promptText,
  setPromptText,
}: TaskPanelPromptProps) {
  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex gap-2 items-center">
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
          <div className="text-[10px] text-muted-foreground">
            Last:{" "}
            <span className="font-medium text-foreground">
              {selectedElementInfo.selector}
            </span>
          </div>
        )}
      </div>
      {iframeAccessError && (
        <div className="text-xs text-red-500">{iframeAccessError}</div>
      )}
      <textarea
        ref={promptTextareaRef}
        className="flex-1 p-3 w-full text-sm rounded border resize-none border-border bg-background focus:outline-none focus:ring-1"
        placeholder="Describe the task referencing elements..."
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
      />
    </div>
  );
}
