import { Annotation } from "./types";
import { ANNOTATION_COLORS } from "./colors";
import { computeArrowheadPoints } from "./arrowhead";

export interface SVGLineAttrs {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface SVGPolygonAttrs {
  type: "polygon";
  points: string;
  fill: string;
}

export interface SVGRectAttrs {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

export type SVGAnnotationElement = SVGLineAttrs | SVGPolygonAttrs | SVGRectAttrs;

/**
 * Returns an array of SVG element attribute objects for rendering an annotation.
 */
export function getAnnotationSVGAttrs(ann: Annotation): SVGAnnotationElement[] {
  const colors = ANNOTATION_COLORS[ann.type];

  if (ann.type === "arrow" && ann.endX !== undefined && ann.endY !== undefined) {
    return [
      {
        type: "line",
        x1: ann.x,
        y1: ann.y,
        x2: ann.endX,
        y2: ann.endY,
        stroke: colors.stroke,
        strokeWidth: 3,
      },
      {
        type: "polygon",
        points: computeArrowheadPoints(ann.x, ann.y, ann.endX, ann.endY),
        fill: colors.stroke,
      },
    ];
  }

  return [
    {
      type: "rect",
      x: ann.x,
      y: ann.y,
      width: ann.width || 0,
      height: ann.height || 0,
      stroke: colors.stroke,
      strokeWidth: 2,
      fill: colors.fill,
    },
  ];
}
