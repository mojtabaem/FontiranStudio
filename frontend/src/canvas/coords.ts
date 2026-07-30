import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/document/types';

/** Convert client (screen) coords to artboard space using the viewport element rect. */
export function clientToArtboard(
  clientX: number,
  clientY: number,
  viewportRect: DOMRectReadOnly,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: (clientX - viewportRect.left - panX) / zoom,
    y: (clientY - viewportRect.top - panY) / zoom,
  };
}

/**
 * Keep the artboard covering the viewport: no empty gutters outside the board.
 * When the scaled artboard is smaller than the viewport (shouldn't happen at min zoom),
 * pan is clamped to center-ish range [0, vp - board].
 */
export function clampPan(
  panX: number,
  panY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): { panX: number; panY: number } {
  const boardW = CANVAS_WIDTH * zoom;
  const boardH = CANVAS_HEIGHT * zoom;

  let nextX = panX;
  let nextY = panY;

  if (boardW <= viewportWidth) {
    nextX = (viewportWidth - boardW) / 2;
  } else {
    const minX = viewportWidth - boardW;
    nextX = Math.min(0, Math.max(minX, panX));
  }

  if (boardH <= viewportHeight) {
    nextY = (viewportHeight - boardH) / 2;
  } else {
    const minY = viewportHeight - boardH;
    nextY = Math.min(0, Math.max(minY, panY));
  }

  return { panX: nextX, panY: nextY };
}

/** Zoom while keeping the artboard point under the cursor fixed. */
export function zoomTowardCursor(
  nextZoom: number,
  prevZoom: number,
  cursorXInViewport: number,
  cursorYInViewport: number,
  panX: number,
  panY: number,
): { zoom: number; panX: number; panY: number } {
  if (prevZoom <= 0 || nextZoom === prevZoom) {
    return { zoom: nextZoom, panX, panY };
  }
  const artX = (cursorXInViewport - panX) / prevZoom;
  const artY = (cursorYInViewport - panY) / prevZoom;
  return {
    zoom: nextZoom,
    panX: cursorXInViewport - artX * nextZoom,
    panY: cursorYInViewport - artY * nextZoom,
  };
}

export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Axis-aligned bounds of an object in artboard space (ignores rotation for hit-tests v1). */
export function objectAabb(obj: {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}): { x: number; y: number; width: number; height: number } {
  const w = Math.abs(obj.width * obj.scaleX);
  const h = Math.abs(obj.height * obj.scaleY);
  // With transform-origin center, visual top-left shifts when scale flips
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  return {
    x: cx - w / 2,
    y: cy - h / 2,
    width: w,
    height: h,
  };
}
