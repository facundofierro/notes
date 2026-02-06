import React, { useRef, useState } from "react";
import { Square, Trash2, ArrowRight, X, CheckCircle2 } from "lucide-react";

type AnnotationType = "modify" | "arrow" | "remove";

export interface Annotation {
  id: number;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  prompt: string;
}

interface ScreenshotAnnotationModalProps {
  screenshot: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  selectedAnnotationId: number | null;
  onSelectAnnotation: (id: number | null) => void;
  onClose: () => void;
  onCreateTask: () => void;
  isCreatingTask: boolean;
}

export function ScreenshotAnnotationModal({
  screenshot,
  annotations,
  onAnnotationsChange,
  selectedAnnotationId,
  onSelectAnnotation,
  onClose,
  onCreateTask,
  isCreatingTask,
}: ScreenshotAnnotationModalProps) {
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const screenshotImageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !selectedTool || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (selectedTool === "arrow") {
      // For arrow, we need at least some distance
      const distance = Math.sqrt(
        Math.pow(currentX - startPos.x, 2) + Math.pow(currentY - startPos.y, 2)
      );
      if (distance > 10) {
        const maxId = annotations.length > 0 ? Math.max(...annotations.map(a => a.id)) : 0;
        const newAnnotation: Annotation = {
          id: maxId + 1,
          type: selectedTool,
          x: startPos.x,
          y: startPos.y,
          endX: currentX,
          endY: currentY,
          prompt: "",
        };
        onAnnotationsChange([...annotations, newAnnotation]);
        onSelectAnnotation(newAnnotation.id);
      }
    } else {
      // For modify and remove, create a box
      const width = Math.abs(currentX - startPos.x);
      const height = Math.abs(currentY - startPos.y);
      const x = Math.min(startPos.x, currentX);
      const y = Math.min(startPos.y, currentY);

      if (width > 5 && height > 5) {
        const maxId = annotations.length > 0 ? Math.max(...annotations.map(a => a.id)) : 0;
        const newAnnotation: Annotation = {
          id: maxId + 1,
          type: selectedTool,
          x,
          y,
          width,
          height,
          prompt: "",
        };
        onAnnotationsChange([...annotations, newAnnotation]);
        onSelectAnnotation(newAnnotation.id);
      }
    }

    setIsDrawing(false);
  };

  const renderArrowhead = (x1: number, y1: number, x2: number, y2: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 12;
    const arrowWidth = 8;

    const point1X = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
    const point1Y = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
    const point2X = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
    const point2Y = y2 - arrowLength * Math.sin(angle + Math.PI / 6);

    return `${x2},${y2} ${point1X},${point1Y} ${point2X},${point2Y}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/50 border-b border-white/10">
        <h2 className="text-white text-lg font-medium">Annotate Screenshot</h2>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Screenshot Canvas */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          ref={imageContainerRef}
          className="relative max-w-full max-h-full cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <img
            ref={screenshotImageRef}
            src={screenshot}
            alt="Screenshot"
            className="max-w-full max-h-[calc(100vh-250px)] w-auto h-auto block"
            draggable={false}
          />

          {/* SVG Overlay for annotations */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              width: screenshotImageRef.current?.clientWidth || "100%",
              height: screenshotImageRef.current?.clientHeight || "100%",
            }}
          >
            {/* Existing annotations */}
            {annotations.map((ann) => {
              if (ann.type === "arrow" && ann.endX !== undefined && ann.endY !== undefined) {
                return (
                  <g key={ann.id}>
                    <line
                      x1={ann.x}
                      y1={ann.y}
                      x2={ann.endX}
                      y2={ann.endY}
                      stroke="#3b82f6"
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                    />
                    <polygon
                      points={renderArrowhead(ann.x, ann.y, ann.endX, ann.endY)}
                      fill="#3b82f6"
                    />
                  </g>
                );
              } else if (ann.type === "modify" || ann.type === "remove") {
                const color = ann.type === "remove" ? "#dc2626" : "#f59e0b";
                const fillColor = ann.type === "remove" ? "rgba(220, 38, 38, 0.15)" : "rgba(245, 158, 11, 0.15)";
                return (
                  <g key={ann.id}>
                    <rect
                      x={ann.x}
                      y={ann.y}
                      width={ann.width || 0}
                      height={ann.height || 0}
                      stroke={color}
                      strokeWidth="2"
                      fill={fillColor}
                    />
                  </g>
                );
              }
              return null;
            })}

            {/* Live preview while drawing */}
            {isDrawing && selectedTool === "arrow" && (
              <g>
                <line
                  x1={startPos.x}
                  y1={startPos.y}
                  x2={currentPos.x}
                  y2={currentPos.y}
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                />
                <polygon
                  points={renderArrowhead(startPos.x, startPos.y, currentPos.x, currentPos.y)}
                  fill="#3b82f6"
                  opacity="0.7"
                />
              </g>
            )}

            {isDrawing && (selectedTool === "modify" || selectedTool === "remove") && (
              <rect
                x={Math.min(startPos.x, currentPos.x)}
                y={Math.min(startPos.y, currentPos.y)}
                width={Math.abs(currentPos.x - startPos.x)}
                height={Math.abs(currentPos.y - startPos.y)}
                stroke={selectedTool === "remove" ? "#dc2626" : "#f59e0b"}
                strokeWidth="2"
                fill={selectedTool === "remove" ? "rgba(220, 38, 38, 0.15)" : "rgba(245, 158, 11, 0.15)"}
                strokeDasharray="5,5"
              />
            )}
          </svg>

          {/* Annotation badges */}
          {annotations.map((ann) => {
            let badgeX, badgeY;
            if (ann.type === "arrow" && ann.endX !== undefined && ann.endY !== undefined) {
              badgeX = ann.endX + 15;
              badgeY = ann.endY - 15;
            } else {
              badgeX = (ann.x || 0) + (ann.width || 0) + 15;
              badgeY = (ann.y || 0) - 15;
            }

            return (
              <div
                key={`badge-${ann.id}`}
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 font-medium pointer-events-auto cursor-pointer transition-all ${
                  selectedAnnotationId === ann.id
                    ? "bg-white text-black border-white scale-110"
                    : "bg-black text-white border-white"
                }`}
                style={{
                  left: badgeX,
                  top: badgeY,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(ann.id);
                }}
              >
                {ann.id}
              </div>
            );
          })}

          {/* Remove label for remove annotations */}
          {annotations.map((ann) => {
            if (ann.type === "remove") {
              return (
                <div
                  key={`label-${ann.id}`}
                  className="absolute bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap pointer-events-none font-medium"
                  style={{
                    left: ann.x,
                    top: (ann.y || 0) - 22,
                  }}
                >
                  REMOVE THIS
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-center gap-4 px-6 py-4 bg-black/50 border-t border-white/10">
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedTool("modify")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTool === "modify"
                ? "bg-orange-500/20 border-orange-500 text-orange-400"
                : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
            }`}
            title="Modify - Draw a box around content to change"
          >
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium">Modify</span>
          </button>
          <button
            onClick={() => setSelectedTool("arrow")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTool === "arrow"
                ? "bg-blue-500/20 border-blue-500 text-blue-400"
                : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
            }`}
            title="Arrow - Draw an arrow to point"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm font-medium">Arrow</span>
          </button>
          <button
            onClick={() => setSelectedTool("remove")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTool === "remove"
                ? "bg-red-500/20 border-red-500 text-red-400"
                : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
            }`}
            title="Remove - Mark content to delete"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Remove</span>
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm text-white/70 border-2 border-white/20 hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreateTask}
            disabled={isCreatingTask}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingTask ? "Creating..." : "Create Task"}
            {!isCreatingTask && <CheckCircle2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
