export type AnnotationType = "modify" | "arrow" | "remove";

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
