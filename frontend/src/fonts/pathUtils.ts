import type { PathPoint, Point, Subpath } from '@/document/types';

export function absHandle(anchor: Point, relative: Point): Point {
  return { x: anchor.x + relative.x, y: anchor.y + relative.y };
}

export function relativeHandle(anchor: Point, absolute: Point): Point {
  return { x: absolute.x - anchor.x, y: absolute.y - anchor.y };
}

/** Convert quadratic control to cubic handles (absolute coords). */
export function quadToCubic(
  p0: Point,
  q: Point,
  p3: Point,
): { c1: Point; c2: Point } {
  return {
    c1: {
      x: p0.x + (2 / 3) * (q.x - p0.x),
      y: p0.y + (2 / 3) * (q.y - p0.y),
    },
    c2: {
      x: p3.x + (2 / 3) * (q.x - p3.x),
      y: p3.y + (2 / 3) * (q.y - p3.y),
    },
  };
}

function emptyPoint(anchor: Point): PathPoint {
  return {
    anchor: { ...anchor },
    handleIn: { x: 0, y: 0 },
    handleOut: { x: 0, y: 0 },
  };
}

/**
 * Parse an SVG path string (absolute M/L/Q/C/Z from HarfBuzz) into Subpaths.
 * Applies optional offset and Y-flip (font Y-up → canvas Y-down).
 */
export function svgPathToSubpaths(
  d: string,
  opts?: { ox?: number; oy?: number; flipY?: boolean },
): Subpath[] {
  const ox = opts?.ox ?? 0;
  const oy = opts?.oy ?? 0;
  const flipY = opts?.flipY ?? true;

  const map = (x: number, y: number): Point => ({
    x: x + ox,
    y: (flipY ? -y : y) + oy,
  });

  const tokens = d.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const subpaths: Subpath[] = [];
  let current: PathPoint[] = [];
  let closed = false;
  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const flush = () => {
    if (current.length >= 1) {
      subpaths.push({ closed, points: current });
    }
    current = [];
    closed = false;
  };

  const ensureCurrent = (pt: Point) => {
    if (current.length === 0) {
      current.push(emptyPoint(pt));
    }
  };

  while (i < tokens.length) {
    const cmd = tokens[i]!;
    if (/^[MLQCZmlqcz]$/.test(cmd)) {
      i++;
      const upper = cmd.toUpperCase();
      const relative = cmd !== upper;

      if (upper === 'Z') {
        closed = true;
        // Close: connect last to first if needed
        if (current.length >= 1) {
          const first = current[0]!;
          const last = current[current.length - 1]!;
          if (
            Math.hypot(last.anchor.x - first.anchor.x, last.anchor.y - first.anchor.y) <
            1e-4
          ) {
            // Merge closing point into first
            first.handleIn = last.handleIn;
            current.pop();
          }
        }
        flush();
        cx = startX;
        cy = startY;
        continue;
      }

      if (upper === 'M') {
        flush();
        const x = Number(tokens[i++]!);
        const y = Number(tokens[i++]!);
        const absX = relative ? cx + x : x;
        const absY = relative ? cy + y : y;
        const pt = map(absX, absY);
        cx = absX;
        cy = absY;
        startX = absX;
        startY = absY;
        current.push(emptyPoint(pt));
        // Subsequent pairs are treated as L
        while (i < tokens.length && !/^[MLQCZmlqcz]$/i.test(tokens[i]!)) {
          const lx = Number(tokens[i++]!);
          const ly = Number(tokens[i++]!);
          const ax = relative ? cx + lx : lx;
          const ay = relative ? cy + ly : ly;
          const p = map(ax, ay);
          cx = ax;
          cy = ay;
          current.push(emptyPoint(p));
        }
        continue;
      }

      if (upper === 'L') {
        while (i < tokens.length && !/^[MLQCZmlqcz]$/i.test(tokens[i]!)) {
          const x = Number(tokens[i++]!);
          const y = Number(tokens[i++]!);
          const ax = relative ? cx + x : x;
          const ay = relative ? cy + y : y;
          const p = map(ax, ay);
          ensureCurrent(map(cx, cy));
          current.push(emptyPoint(p));
          cx = ax;
          cy = ay;
        }
        continue;
      }

      if (upper === 'Q') {
        while (i < tokens.length && !/^[MLQCZmlqcz]$/i.test(tokens[i]!)) {
          const qx = Number(tokens[i++]!);
          const qy = Number(tokens[i++]!);
          const x = Number(tokens[i++]!);
          const y = Number(tokens[i++]!);
          const aqx = relative ? cx + qx : qx;
          const aqy = relative ? cy + qy : qy;
          const ax = relative ? cx + x : x;
          const ay = relative ? cy + y : y;
          const p0 = map(cx, cy);
          const q = map(aqx, aqy);
          const p3 = map(ax, ay);
          const { c1, c2 } = quadToCubic(p0, q, p3);
          ensureCurrent(p0);
          const last = current[current.length - 1]!;
          last.handleOut = relativeHandle(last.anchor, c1);
          const next = emptyPoint(p3);
          next.handleIn = relativeHandle(p3, c2);
          current.push(next);
          cx = ax;
          cy = ay;
        }
        continue;
      }

      if (upper === 'C') {
        while (i < tokens.length && !/^[MLQCZmlqcz]$/i.test(tokens[i]!)) {
          const x1 = Number(tokens[i++]!);
          const y1 = Number(tokens[i++]!);
          const x2 = Number(tokens[i++]!);
          const y2 = Number(tokens[i++]!);
          const x = Number(tokens[i++]!);
          const y = Number(tokens[i++]!);
          const ax1 = relative ? cx + x1 : x1;
          const ay1 = relative ? cy + y1 : y1;
          const ax2 = relative ? cx + x2 : x2;
          const ay2 = relative ? cy + y2 : y2;
          const ax = relative ? cx + x : x;
          const ay = relative ? cy + y : y;
          const p0 = map(cx, cy);
          const c1 = map(ax1, ay1);
          const c2 = map(ax2, ay2);
          const p3 = map(ax, ay);
          ensureCurrent(p0);
          const last = current[current.length - 1]!;
          last.handleOut = relativeHandle(last.anchor, c1);
          const next = emptyPoint(p3);
          next.handleIn = relativeHandle(p3, c2);
          current.push(next);
          cx = ax;
          cy = ay;
        }
        continue;
      }
    } else {
      // Unexpected number — skip
      i++;
    }
  }

  flush();
  return subpaths.filter((s) => s.points.length > 0);
}

export function subpathsToSvgD(subpaths: Subpath[]): string {
  const parts: string[] = [];
  for (const sp of subpaths) {
    if (sp.points.length === 0) continue;
    const first = sp.points[0]!;
    parts.push(`M ${first.anchor.x} ${first.anchor.y}`);
    for (let i = 1; i < sp.points.length; i++) {
      const prev = sp.points[i - 1]!;
      const cur = sp.points[i]!;
      const c1 = absHandle(prev.anchor, prev.handleOut);
      const c2 = absHandle(cur.anchor, cur.handleIn);
      const isLine =
        Math.abs(prev.handleOut.x) < 1e-6 &&
        Math.abs(prev.handleOut.y) < 1e-6 &&
        Math.abs(cur.handleIn.x) < 1e-6 &&
        Math.abs(cur.handleIn.y) < 1e-6;
      if (isLine) {
        parts.push(`L ${cur.anchor.x} ${cur.anchor.y}`);
      } else {
        parts.push(
          `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${cur.anchor.x} ${cur.anchor.y}`,
        );
      }
    }
    if (sp.closed && sp.points.length > 1) {
      const last = sp.points[sp.points.length - 1]!;
      const c1 = absHandle(last.anchor, last.handleOut);
      const c2 = absHandle(first.anchor, first.handleIn);
      const isLine =
        Math.abs(last.handleOut.x) < 1e-6 &&
        Math.abs(last.handleOut.y) < 1e-6 &&
        Math.abs(first.handleIn.x) < 1e-6 &&
        Math.abs(first.handleIn.y) < 1e-6;
      if (isLine) {
        parts.push('Z');
      } else {
        parts.push(
          `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${first.anchor.x} ${first.anchor.y} Z`,
        );
      }
    }
  }
  return parts.join(' ');
}

export function translateSubpaths(subpaths: Subpath[], dx: number, dy: number): Subpath[] {
  return subpaths.map((sp) => ({
    ...sp,
    points: sp.points.map((p) => ({
      ...p,
      anchor: { x: p.anchor.x + dx, y: p.anchor.y + dy },
    })),
  }));
}

export function getSubpathsBounds(subpaths: Subpath[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const consider = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const sp of subpaths) {
    for (const p of sp.points) {
      consider(p.anchor.x, p.anchor.y);
      const hi = absHandle(p.anchor, p.handleIn);
      const ho = absHandle(p.anchor, p.handleOut);
      consider(hi.x, hi.y);
      consider(ho.x, ho.y);
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Approximate point distance to cubic Bezier; returns t in [0,1] of nearest sample. */
export function nearestPointOnCubic(
  p0: Point,
  c1: Point,
  c2: Point,
  p3: Point,
  target: Point,
  samples = 24,
): { t: number; point: Point; dist: number } {
  let bestT = 0;
  let bestDist = Infinity;
  let bestPt = p0;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const point = {
      x:
        mt * mt * mt * p0.x +
        3 * mt * mt * t * c1.x +
        3 * mt * t * t * c2.x +
        t * t * t * p3.x,
      y:
        mt * mt * mt * p0.y +
        3 * mt * mt * t * c1.y +
        3 * mt * t * t * c2.y +
        t * t * t * p3.y,
    };
    const dist = Math.hypot(point.x - target.x, point.y - target.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
      bestPt = point;
    }
  }
  return { t: bestT, point: bestPt, dist: bestDist };
}

export function splitCubicAt(
  p0: Point,
  c1: Point,
  c2: Point,
  p3: Point,
  t: number,
): {
  left: { c1: Point; c2: Point; p3: Point };
  right: { c1: Point; c2: Point; p3: Point };
  mid: Point;
} {
  const lerp = (a: Point, b: Point, u: number): Point => ({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
  });
  const p01 = lerp(p0, c1, t);
  const p12 = lerp(c1, c2, t);
  const p23 = lerp(c2, p3, t);
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);
  const mid = lerp(p012, p123, t);
  return {
    left: { c1: p01, c2: p012, p3: mid },
    right: { c1: p123, c2: p23, p3 },
    mid,
  };
}
