/**
 * Computes the three points of an arrowhead polygon at the end of a line.
 * Returns a string suitable for an SVG <polygon points="..."> attribute.
 */
export function computeArrowheadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length: number = 12,
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  const point1X = x2 - length * Math.cos(angle - Math.PI / 6);
  const point1Y = y2 - length * Math.sin(angle - Math.PI / 6);
  const point2X = x2 - length * Math.cos(angle + Math.PI / 6);
  const point2Y = y2 - length * Math.sin(angle + Math.PI / 6);

  return `${x2},${y2} ${point1X},${point1Y} ${point2X},${point2Y}`;
}
