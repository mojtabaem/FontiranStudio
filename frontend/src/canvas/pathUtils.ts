import type { PathPoint, Point, Subpath } from '@/document/types';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function absHandle(anchor: Point, handle: Point): Point {
  return { x: anchor.x + handle.x, y: anchor.y + handle.y };
}

/** Build an SVG path `d` for a single open/closed subpath using cubic beziers. */
export function pointsToSvgD(points: PathPoint[], closed: boolean): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const parts: string[] = [`M ${first.anchor.x} ${first.anchor.y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const cp1 = absHandle(a.anchor, a.handleOut);
    const cp2 = absHandle(b.anchor, b.handleIn);
    parts.push(`C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${b.anchor.x} ${b.anchor.y}`);
  }

  if (closed && points.length > 1) {
    const last = points[points.length - 1]!;
    const cp1 = absHandle(last.anchor, last.handleOut);
    const cp2 = absHandle(first.anchor, first.handleIn);
    parts.push(`C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${first.anchor.x} ${first.anchor.y}`);
    parts.push('Z');
  }

  return parts.join(' ');
}

/** Concatenate all subpaths into a single SVG `d` string. */
export function subpathsToSvgD(subpaths: Subpath[]): string {
  return subpaths
    .map((sp) => pointsToSvgD(sp.points, sp.closed))
    .filter(Boolean)
    .join(' ');
}

/** Flatten all anchors + absolute handle positions for bounds. */
export function collectSubpathPoints(subpaths: Subpath[]): Point[] {
  const out: Point[] = [];
  for (const sp of subpaths) {
    for (const p of sp.points) {
      out.push(p.anchor);
      out.push(absHandle(p.anchor, p.handleIn));
      out.push(absHandle(p.anchor, p.handleOut));
    }
  }
  return out;
}

export function boundsOfPoints(points: Point[]): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

export function boundsOfSubpaths(subpaths: Subpath[]): Bounds {
  return boundsOfPoints(collectSubpathPoints(subpaths));
}

/** Convenience: polyline through anchors only (straight segments). */
export function anchorsToSvgD(points: PathPoint[], closed: boolean): string {
  if (points.length === 0) return '';
  const parts = points.map((p, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd} ${p.anchor.x} ${p.anchor.y}`;
  });
  if (closed) parts.push('Z');
  return parts.join(' ');
}
