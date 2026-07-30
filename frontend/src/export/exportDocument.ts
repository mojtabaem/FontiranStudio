import type { CanvasObject, ShapeObject, TextObject } from '@/document/types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/document/types';
import { getFontBuffer } from '@/fonts/fontBufferCache';
import { subpathsToSvgD } from '@/canvas/pathUtils';
import { textToPath } from '@/fonts/textToPath';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function objectTransform(obj: CanvasObject): string {
  const cx = obj.width / 2;
  const cy = obj.height / 2;
  const parts: string[] = [];
  parts.push(`translate(${obj.x} ${obj.y})`);
  if (obj.rotation) {
    parts.push(`rotate(${obj.rotation} ${cx} ${cy})`);
  }
  if (obj.scaleX !== 1 || obj.scaleY !== 1) {
    parts.push(`translate(${cx} ${cy}) scale(${obj.scaleX} ${obj.scaleY}) translate(${-cx} ${-cy})`);
  }
  return parts.join(' ');
}

async function shapePathsForObject(
  obj: CanvasObject,
  resolveFont: (faceId: string) => Promise<ArrayBuffer | null>,
): Promise<{ d: string; fill: string; stroke: string; strokeWidth: number; opacity: number } | null> {
  if (!obj.visible) return null;

  if (obj.type === 'shape') {
    const shape = obj as ShapeObject;
    return {
      d: subpathsToSvgD(shape.subpaths),
      fill: shape.appearance.fill,
      stroke: shape.appearance.stroke,
      strokeWidth: shape.appearance.strokeWidth,
      opacity: shape.appearance.opacity,
    };
  }

  const text = obj as TextObject;
  if (!text.fontFaceId) {
    // Placeholder rect when no font
    return {
      d: `M 0 0 H ${text.width} V ${text.height} H 0 Z`,
      fill: text.appearance.fill,
      stroke: text.appearance.stroke,
      strokeWidth: text.appearance.strokeWidth,
      opacity: text.appearance.opacity,
    };
  }

  const buffer = await resolveFont(text.fontFaceId);
  if (!buffer) {
    return {
      d: `M 0 0 H ${text.width} V ${text.height} H 0 Z`,
      fill: text.appearance.fill,
      stroke: text.appearance.stroke,
      strokeWidth: text.appearance.strokeWidth,
      opacity: text.appearance.opacity,
    };
  }

  const result = await textToPath({
    fontBuffer: buffer,
    text: text.text,
    fontSize: text.fontSize,
    features: text.features,
    axes: text.variableAxes,
    letterSpacing: text.letterSpacing,
  });

  return {
    d: subpathsToSvgD(result.subpaths),
    fill: text.appearance.fill,
    stroke: text.appearance.stroke,
    strokeWidth: text.appearance.strokeWidth,
    opacity: text.appearance.opacity,
  };
}

export function getVisibleBounds(
  objects: Record<string, CanvasObject>,
  order: string[],
): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of order) {
    const obj = objects[id];
    if (!obj || !obj.visible) continue;
    const x0 = obj.x;
    const y0 = obj.y;
    const x1 = obj.x + obj.width * Math.abs(obj.scaleX);
    const y1 = obj.y + obj.height * Math.abs(obj.scaleY);
    // Rough AABB ignoring rotation for tight-ish bounds
    if (obj.rotation) {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      const rad = (obj.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const w = obj.width * Math.abs(obj.scaleX);
      const h = obj.height * Math.abs(obj.scaleY);
      const bw = w * cos + h * sin;
      const bh = w * sin + h * cos;
      minX = Math.min(minX, cx - bw / 2);
      minY = Math.min(minY, cy - bh / 2);
      maxX = Math.max(maxX, cx + bw / 2);
      maxY = Math.max(maxY, cy + bh / 2);
    } else {
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);
    }
  }

  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }

  const pad = 2;
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(1, maxX - minX + pad * 2),
    height: Math.max(1, maxY - minY + pad * 2),
  };
}

export async function buildSvg(
  objects: Record<string, CanvasObject>,
  order: string[],
  bounds: Bounds,
  resolveFont: (faceId: string) => Promise<ArrayBuffer | null> = (faceId) =>
    getFontBuffer(faceId).catch(() => null),
): Promise<string> {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">`,
  );

  for (const id of order) {
    const obj = objects[id];
    if (!obj || !obj.visible) continue;
    const rendered = await shapePathsForObject(obj, resolveFont);
    if (!rendered || !rendered.d) continue;

    const fill =
      rendered.fill === 'transparent' || rendered.fill === 'none'
        ? 'none'
        : escapeXml(rendered.fill);
    const stroke =
      rendered.stroke === 'transparent' || rendered.stroke === 'none'
        ? 'none'
        : escapeXml(rendered.stroke);

    parts.push(
      `<g transform="${objectTransform(obj)}" opacity="${rendered.opacity}">` +
        `<path d="${escapeXml(rendered.d)}" fill="${fill}" stroke="${stroke}" stroke-width="${rendered.strokeWidth}" fill-rule="nonzero"/>` +
        `</g>`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

export async function svgToPngBlob(
  svg: string,
  width: number,
  height: number,
): Promise<Blob> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load SVG for PNG export'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
        'image/png',
      );
    });
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copySvgToClipboard(svg: string): Promise<void> {
  await navigator.clipboard.writeText(svg);
}

export async function copyPngToClipboard(blob: Blob): Promise<void> {
  if (typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return;
  }
  throw new Error('ClipboardItem not supported');
}

export async function prepareExport(
  objects: Record<string, CanvasObject>,
  order: string[],
  target: 'design' | string,
): Promise<{ svg: string; bounds: Bounds }> {
  let ids = order;
  let objs = objects;

  if (target !== 'design') {
    const obj = objects[target];
    if (!obj) throw new Error('Export target not found');
    ids = [target];
    objs = { [target]: obj };
  }

  const bounds =
    target === 'design'
      ? { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
      : getVisibleBounds(objs, ids);

  const svg = await buildSvg(objs, ids, bounds);
  return { svg, bounds };
}
