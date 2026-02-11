import React from "react";
import { Trash2 } from "lucide-react";
import { Annotation, AnnotationType } from "@/types/entities";

interface AnnotationPromptListProps {
  annotations: Annotation[];
  selectedAnnotationId: number | null | undefined;
  onSelectAnnotation?: (id: number | null) => void;
  onUpdatePrompt: (id: number, prompt: string) => void;
  onDeleteAnnotation: (id: number) => void;
}

export function AnnotationPromptList({
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onUpdatePrompt,
  onDeleteAnnotation,
}: AnnotationPromptListProps) {
  const getTypeInfo = (type: AnnotationType) => {
    switch (type) {
      case "modify":
        return {
          badgeBg: "bg-orange-500",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
        };
      case "arrow":
        return {
          badgeBg: "bg-blue-600",
          bgColor: "bg-blue-600/10",
          borderColor: "border-blue-600/30",
        };
      case "remove":
        return {
          badgeBg: "bg-red-600",
          bgColor: "bg-red-600/10",
          borderColor: "border-red-600/30",
        };
    }
  };

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <p className="text-sm">No annotations yet</p>
        <p className="text-xs mt-2">
          Use the modal to add annotations to the screenshot
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground px-1 mb-3">
        Annotations ({annotations.length})
      </div>
      {annotations.map((ann) => {
        const typeInfo = getTypeInfo(ann.type);
        const isSelected = selectedAnnotationId === ann.id;

        return (
          <div
            key={ann.id}
            className={`border rounded-lg transition-all cursor-pointer ${
              isSelected
                ? `${typeInfo.borderColor} border-2 ${typeInfo.bgColor}`
                : "border-border bg-secondary/20 hover:bg-secondary/40"
            }`}
            onClick={() => onSelectAnnotation?.(ann.id)}
          >
            {/* Header */}
            <div className="flex items-center gap-2 p-2">
              {/* Badge */}
              <div
                className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white transition-all shadow-sm ${typeInfo.badgeBg}`}
              >
                {ann.id}
              </div>

              {/* Prompt Preview (when not selected) */}
              <div className="flex-1 min-w-0">
                {!isSelected && (
                  <p
                    className={`text-[11px] truncate ${ann.prompt ? "text-foreground" : "text-muted-foreground italic"}`}
                  >
                    {ann.prompt || "No instructions..."}
                  </p>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(ann.id);
                }}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                title="Delete annotation"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Prompt Area */}
            {isSelected && (
              <div className="px-2 pb-2 pt-1 border-t border-border/50">
                <textarea
                  autoFocus
                  className="w-full text-xs p-2 rounded border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add instructions..."
                  value={ann.prompt}
                  onChange={(e) => onUpdatePrompt(ann.id, e.target.value)}
                  rows={3}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
