import React, { useRef, useEffect, useCallback } from "react";
import { Square, Trash2, ArrowRight, X, CheckCircle2 } from "lucide-react";
import { Annotation, AnnotationType } from "@/types/entities";
import { computeArrowheadPoints, ANNOTATION_COLORS } from "@agelum/annotation";

interface ScreenshotViewerProps {
  screenshot: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  selectedAnnotationId: number | null;
  onSelectAnnotation: (id: number | null) => void;
  onClose: () => void;
  selectedTool: AnnotationType | null;
  onToolSelect: (tool: AnnotationType | null) => void;
  onDisplaySizeChange?: (size: { width: number; height: number }) => void;
}

export function ScreenshotViewer({
  screenshot,
  annotations,
  onAnnotationsChange,
  selectedAnnotationId,
  onSelectAnnotation,
  onClose,
  selectedTool,
  onToolSelect,
  onDisplaySizeChange,
}: ScreenshotViewerProps) {
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = React.useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const screenshotImageRef = useRef<HTMLImageElement>(null);

  const reportDisplaySize = useCallback(() => {
    const img = screenshotImageRef.current;
    if (img && img.clientWidth && img.clientHeight && onDisplaySizeChange) {
      onDisplaySizeChange({ width: img.clientWidth, height: img.clientHeight });
    }
  }, [onDisplaySizeChange]);

  useEffect(() => {
    const img = screenshotImageRef.current;
    if (!img) return;
    // Report on load
    const handleLoad = () => reportDisplaySize();
    img.addEventListener("load", handleLoad);
    // Report if already loaded
    if (img.complete) reportDisplaySize();
    // Report on resize
    const ro = new ResizeObserver(reportDisplaySize);
    ro.observe(img);
    return () => {
      img.removeEventListener("load", handleLoad);
      ro.disconnect();
    };
  }, [reportDisplaySize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || !screenshotImageRef.current) return;

    const rect = screenshotImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !screenshotImageRef.current) return;

    const rect = screenshotImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !selectedTool || !screenshotImageRef.current) return;

    const rect = screenshotImageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (selectedTool === "arrow") {
      const distance = Math.sqrt(
        Math.pow(currentX - startPos.x, 2) + Math.pow(currentY - startPos.y, 2),
      );
      if (distance > 10) {
        const maxId =
          annotations.length > 0
            ? Math.max(...annotations.map((a) => a.id))
            : 0;
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
      const width = Math.abs(currentX - startPos.x);
      const height = Math.abs(currentY - startPos.y);
      const x = Math.min(startPos.x, currentX);
      const y = Math.min(startPos.y, currentY);

      if (width > 5 && height > 5) {
        const maxId =
          annotations.length > 0
            ? Math.max(...annotations.map((a) => a.id))
            : 0;
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

  const renderArrowhead = (x1: number, y1: number, x2: number, y2: number) =>
    computeArrowheadPoints(x1, y1, x2, y2);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="grid grid-cols-3 items-center px-4 py-2 bg-secondary/50 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Screenshot</h3>

        <div className="flex justify-center gap-2">
          <button
            onClick={() => onToolSelect("modify")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all ${
              selectedTool === "modify"
                ? "bg-orange-500/30 border-orange-500 text-orange-400 shadow-sm"
                : "bg-background border-border text-muted-foreground hover:bg-secondary/50"
            }`}
            title="Modify - Draw a box around content to change"
          >
            <Square className="w-3 h-3" />
            <span>Modify</span>
          </button>
          <button
            onClick={() => onToolSelect("arrow")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all ${
              selectedTool === "arrow"
                ? "bg-blue-500/30 border-blue-500 text-blue-400 shadow-sm"
                : "bg-background border-border text-muted-foreground hover:bg-secondary/50"
            }`}
            title="Arrow - Draw an arrow to point"
          >
            <ArrowRight className="w-3 h-3" />
            <span>Arrow</span>
          </button>
          <button
            onClick={() => onToolSelect("remove")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all ${
              selectedTool === "remove"
                ? "bg-red-500/30 border-red-500 text-red-400 shadow-sm"
                : "bg-background border-border text-muted-foreground hover:bg-secondary/50"
            }`}
            title="Remove - Mark content to delete"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-secondary rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screenshot Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-background">
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
            className="max-w-full max-h-full w-auto h-auto block"
            draggable={false}
          />

          {/* SVG Overlay for annotations */}
          <svg
            className="absolute pointer-events-none"
            style={{
              left: screenshotImageRef.current?.offsetLeft || 0,
              top: screenshotImageRef.current?.offsetTop || 0,
              width: screenshotImageRef.current?.clientWidth || "100%",
              height: screenshotImageRef.current?.clientHeight || "100%",
            }}
          >
            {/* Existing annotations */}
            {annotations.map((ann) => {
              if (
                ann.type === "arrow" &&
                ann.endX !== undefined &&
                ann.endY !== undefined
              ) {
                return (
                  <g key={ann.id}>
                    <line
                      x1={ann.x}
                      y1={ann.y}
                      x2={ann.endX}
                      y2={ann.endY}
                      stroke={ANNOTATION_COLORS.arrow.stroke}
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                    />
                    <polygon
                      points={renderArrowhead(ann.x, ann.y, ann.endX, ann.endY)}
                      fill={ANNOTATION_COLORS.arrow.stroke}
                    />
                  </g>
                );
              } else if (ann.type === "modify" || ann.type === "remove") {
                const colors = ANNOTATION_COLORS[ann.type];
                const color = colors.stroke;
                const fillColor = colors.fill;
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
                  stroke={ANNOTATION_COLORS.arrow.stroke}
                  strokeWidth="3"
                  strokeDasharray="5,5"
                />
                <polygon
                  points={renderArrowhead(
                    startPos.x,
                    startPos.y,
                    currentPos.x,
                    currentPos.y,
                  )}
                  fill={ANNOTATION_COLORS.arrow.stroke}
                  opacity="0.7"
                />
              </g>
            )}

            {isDrawing &&
              (selectedTool === "modify" || selectedTool === "remove") && (
                <rect
                  x={Math.min(startPos.x, currentPos.x)}
                  y={Math.min(startPos.y, currentPos.y)}
                  width={Math.abs(currentPos.x - startPos.x)}
                  height={Math.abs(currentPos.y - startPos.y)}
                  stroke={ANNOTATION_COLORS[selectedTool].stroke}
                  strokeWidth="2"
                  fill={ANNOTATION_COLORS[selectedTool].fill}
                  strokeDasharray="5,5"
                />
              )}
          </svg>

          {/* Remove label for remove annotations */}
          {annotations.map((ann) => {
            if (ann.type === "remove") {
              const imgLeft = screenshotImageRef.current?.offsetLeft || 0;
              const imgTop = screenshotImageRef.current?.offsetTop || 0;
              return (
                <div
                  key={`label-${ann.id}`}
                  className="absolute bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap pointer-events-none font-medium"
                  style={{
                    left: (ann.x || 0) + 12 + imgLeft,
                    top: (ann.y || 0) - 25 + imgTop,
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
    </div>
  );
}
