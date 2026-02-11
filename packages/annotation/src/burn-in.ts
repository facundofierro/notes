import { Annotation } from "./types";
import { ANNOTATION_COLORS } from "./colors";

export interface BurnInOptions {
  screenshotDataUrl: string;
  annotations: Annotation[];
  displayWidth: number;
  displayHeight: number;
}

/**
 * Burns annotations into a screenshot image using Canvas 2D.
 * Returns a data URL of the composited PNG.
 */
export async function burnAnnotations(opts: BurnInOptions): Promise<string> {
  const { screenshotDataUrl, annotations, displayWidth, displayHeight } = opts;

  const canvas = document.createElement("canvas");
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load screenshot"));
    img.src = screenshotDataUrl;
  });

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;
  canvas.width = naturalWidth;
  canvas.height = naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas 2d context");

  ctx.drawImage(img, 0, 0);

  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;
  const scale = Math.min(scaleX, scaleY) || 1;

  annotations.forEach((ann) => {
    const mappedX = ann.x * scaleX;
    const mappedY = ann.y * scaleY;
    const mappedWidth = (ann.width || 0) * scaleX;
    const mappedHeight = (ann.height || 0) * scaleY;

    const badgeRadius = Math.max(10, 12 * scale);
    const strokeWidth = Math.max(2, 2 * scale);
    const fontSize = Math.max(10, 10 * scale);

    const colors = ANNOTATION_COLORS[ann.type];
    const mainColor = colors.stroke;
    const fillColor = colors.fill;
    const badgeBgColor = colors.badge;

    if (
      ann.type === "arrow" &&
      ann.endX !== undefined &&
      ann.endY !== undefined
    ) {
      const startX = mappedX;
      const startY = mappedY;
      const endX = ann.endX * scaleX;
      const endY = ann.endY * scaleY;

      ctx.strokeStyle = mainColor;
      ctx.lineWidth = strokeWidth * 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 12 * scale;
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - Math.PI / 6),
        endY - arrowLength * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + Math.PI / 6),
        endY - arrowLength * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = mainColor;
      ctx.fillStyle = fillColor;
      ctx.strokeRect(mappedX, mappedY, mappedWidth, mappedHeight);
      ctx.fillRect(mappedX, mappedY, mappedWidth, mappedHeight);

      if (ann.type === "remove") {
        const label = "REMOVE THIS";
        ctx.font = `bold ${Math.max(8, 9 * scale)}px sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const labelPadding = 4 * scale;
        const labelWidth = ctx.measureText(label).width + labelPadding * 2;
        const labelHeight = Math.max(12, 14 * scale);
        const labelX = mappedX + 12 * scale;
        const labelY = mappedY - 25 * scale;

        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 2 * scale);
          ctx.fill();
        } else {
          ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, labelX + labelPadding, labelY + labelHeight / 2);
      }
    }

    // Badge circle
    const badgeX = mappedX;
    const badgeY = mappedY;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = badgeBgColor;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius - 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(ann.id), badgeX, badgeY);
  });

  return canvas.toDataURL("image/png");
}
