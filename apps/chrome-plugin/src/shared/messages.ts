import { Annotation, AnnotationType } from "@agelum/annotation";

export type ExtensionMessage =
  | { type: "CAPTURE_TAB" }
  | { type: "CAPTURE_RESULT"; dataUrl: string; tabId: number }
  | { type: "INJECT_OVERLAY"; screenshotDataUrl: string }
  | { type: "SET_TOOL"; tool: AnnotationType }
  | { type: "ANNOTATIONS_COMPLETE"; annotations: Annotation[]; displayWidth: number; displayHeight: number }
  | { type: "OVERLAY_DISMISSED" };
