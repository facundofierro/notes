import React from "react";
import { Camera } from "lucide-react";
import { AnnotationPromptList } from "@/components/features/work/AnnotationPromptList";
import { Annotation } from "@/types/entities";

interface TaskPanelScreenProps {
  screenshot: string | null;
  handleCaptureScreen: () => Promise<void>;
  selectedGeneralPrompt: boolean;
  setSelectedGeneralPrompt: (selected: boolean) => void;
  generalPrompt: string;
  setGeneralPrompt: (prompt: string) => void;
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  onSelectAnnotation: (id: number | null) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  handleDeleteAnnotation: (id: number) => void;
}

export function TaskPanelScreen({
  screenshot,
  handleCaptureScreen,
  selectedGeneralPrompt,
  setSelectedGeneralPrompt,
  generalPrompt,
  setGeneralPrompt,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onAnnotationsChange,
  handleDeleteAnnotation,
}: TaskPanelScreenProps) {
  return (
    <div className="flex flex-col h-full">
      {!screenshot ? (
        <div className="flex flex-col justify-center items-center h-64 rounded-lg border-2 border-dashed border-border bg-secondary/20">
          <button
            onClick={handleCaptureScreen}
            className="flex flex-col gap-2 items-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <Camera className="w-8 h-8" />
            <span className="text-sm">Capture Screen</span>
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
              setSelectedGeneralPrompt(!selectedGeneralPrompt);
              onSelectAnnotation(null);
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
                    {generalPrompt || "General instructions (optional)..."}
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
                  value={generalPrompt}
                  onChange={(e) => setGeneralPrompt(e.target.value)}
                  rows={3}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          <AnnotationPromptList
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={(id) => {
              onSelectAnnotation(id);
              if (id !== null) setSelectedGeneralPrompt(false);
            }}
            onUpdatePrompt={(id, prompt) => {
              onAnnotationsChange(
                annotations.map((a) =>
                  a.id === id
                    ? {
                        ...a,
                        prompt,
                      }
                    : a,
                ),
              );
            }}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        </div>
      )}
    </div>
  );
}
