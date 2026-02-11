import React from "react";
import { Annotation, AnnotationType } from "@/types/entities";

export interface PanelProps {
  repo: string;
  projectPath?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  electronBrowserView?: ElectronBrowserViewAPI;

  // Task/Screenshot related (may be shared or moved)
  isScreenshotMode?: boolean;
  onScreenshotModeChange?: (isActive: boolean) => void;
  screenshot?: string | null;
  onScreenshotChange?: (screenshot: string | null) => void;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  selectedAnnotationId?: number | null;
  onSelectAnnotation?: (id: number | null) => void;
  selectedTool?: AnnotationType | null;
  onToolSelect?: (tool: AnnotationType | null) => void;
  screenshotDisplaySize?: { width: number; height: number } | null;
  onRequestCapture?: () => Promise<string | null>;
  onTaskCreated?: () => void;
}

export interface PanelDefinition {
  id: string;
  title: string;
  icon: React.ElementType;
  component: React.ComponentType<PanelProps>;
}
