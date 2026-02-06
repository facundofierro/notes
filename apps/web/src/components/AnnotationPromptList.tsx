import React from "react";
import { Square, ArrowRight, Trash2, ChevronDown, ChevronRight } from "lucide-react";

type AnnotationType = "modify" | "arrow" | "remove";

interface Annotation {
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

interface AnnotationPromptListProps {
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  onSelectAnnotation: (id: number) => void;
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
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    // Auto-expand selected annotation
    if (selectedAnnotationId !== null && !expandedIds.has(selectedAnnotationId)) {
      setExpandedIds(new Set([...expandedIds, selectedAnnotationId]));
    }
  }, [selectedAnnotationId, expandedIds]);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getTypeInfo = (type: AnnotationType) => {
    switch (type) {
      case "modify":
        return {
          icon: Square,
          label: "Modify",
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
        };
      case "arrow":
        return {
          icon: ArrowRight,
          label: "Arrow",
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
        };
      case "remove":
        return {
          icon: Trash2,
          label: "Remove",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
        };
    }
  };

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <p className="text-sm">No annotations yet</p>
        <p className="text-xs mt-2">Use the modal to add annotations to the screenshot</p>
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
        const Icon = typeInfo.icon;
        const isExpanded = expandedIds.has(ann.id);
        const isSelected = selectedAnnotationId === ann.id;

        return (
          <div
            key={ann.id}
            className={`border rounded-lg transition-all ${
              isSelected
                ? `${typeInfo.borderColor} border-2 ${typeInfo.bgColor}`
                : "border-border bg-secondary/20"
            }`}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => {
                onSelectAnnotation(ann.id);
                if (!isExpanded) {
                  toggleExpand(ann.id);
                }
              }}
            >
              {/* Expand/Collapse Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(ann.id);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {/* Badge */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  isSelected
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border"
                }`}
              >
                {ann.id}
              </div>

              {/* Type Icon & Label */}
              <div className={`flex items-center gap-1.5 flex-1 ${typeInfo.color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{typeInfo.label}</span>
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

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-2 pb-2 pt-1 border-t border-border/50">
                <textarea
                  className="w-full text-xs p-2 rounded border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add instructions for this annotation..."
                  value={ann.prompt}
                  onChange={(e) => onUpdatePrompt(ann.id, e.target.value)}
                  rows={3}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
