import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import type { PathPoint, Point, ShapeObject, Subpath } from '@/document/types';
import { boundsOfSubpaths, subpathsToSvgD } from '@/canvas/pathUtils';
import {
  absHandle,
  nearestPointOnCubic,
  relativeHandle,
  splitCubicAt,
} from '@/fonts/pathUtils';

const HIT_THRESHOLD = 8;

type DragKind =
  | { kind: 'anchor'; subpathIndex: number; pointIndex: number }
  | { kind: 'handleIn'; subpathIndex: number; pointIndex: number }
  | { kind: 'handleOut'; subpathIndex: number; pointIndex: number };

function cloneSubpaths(subpaths: Subpath[]): Subpath[] {
  return structuredClone(subpaths);
}

export function PathEditor() {
  const pathEditObjectId = useEditorStore((s) => s.pathEditObjectId);
  const selectedPathPoint = useEditorStore((s) => s.selectedPathPoint);
  const setSelectedPathPoint = useEditorStore((s) => s.setSelectedPathPoint);
  const zoom = useEditorStore((s) => s.zoom);

  const objects = useDocumentStore((s) => s.objects);
  const updateObject = useDocumentStore((s) => s.updateObject);
  const pushHistory = useDocumentStore((s) => s.pushHistory);

  const obj = pathEditObjectId ? objects[pathEditObjectId] : null;
  const shape = obj?.type === 'shape' ? (obj as ShapeObject) : null;

  const [drag, setDrag] = useState<DragKind | null>(null);
  const dragOrigin = useRef<{
    pointer: Point;
    subpaths: Subpath[];
  } | null>(null);

  const d = useMemo(
    () => (shape ? subpathsToSvgD(shape.subpaths) : ''),
    [shape],
  );

  const viewBox = useMemo(() => {
    if (!shape) return { x: 0, y: 0, w: 1, h: 1 };
    const b = boundsOfSubpaths(shape.subpaths);
    return {
      x: b.width > 0 ? b.x : 0,
      y: b.height > 0 ? b.y : 0,
      w: b.width > 0 ? b.width : shape.width || 1,
      h: b.height > 0 ? b.height : shape.height || 1,
    };
  }, [shape]);


  const commitSubpaths = useCallback(
    (subpaths: Subpath[], history: boolean) => {
      if (!shape) return;
      updateObject(shape.id, { subpaths } as Partial<ShapeObject>, {
        history,
      });
    },
    [shape, updateObject],
  );

  const toLocal = (e: ReactPointerEvent, el: Element): Point => {
    const rect = el.getBoundingClientRect();
    // Screen → object CSS box (artboard scale already in getBoundingClientRect)
    const localX = ((e.clientX - rect.left) / rect.width) * (shape?.width || 1);
    const localY = ((e.clientY - rect.top) / rect.height) * (shape?.height || 1);
    // Object box → path/viewBox space
    const pathX = viewBox.x + (localX / (shape?.width || 1)) * viewBox.w;
    const pathY = viewBox.y + (localY / (shape?.height || 1)) * viewBox.h;
    return { x: pathX, y: pathY };
  };

  const screenDeltaToPath = (dxScreen: number, dyScreen: number): Point => {
    const w = shape?.width || 1;
    const h = shape?.height || 1;
    // dxScreen is in CSS pixels of the page; object is drawn at w*zoom by h*zoom
    const dxLocal = dxScreen / zoom;
    const dyLocal = dyScreen / zoom;
    return {
      x: (dxLocal / w) * viewBox.w,
      y: (dyLocal / h) * viewBox.h,
    };
  };

  const onAnchorDown = (
    e: ReactPointerEvent,
    subpathIndex: number,
    pointIndex: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!shape) return;
    setSelectedPathPoint({ subpathIndex, pointIndex });
    setDrag({ kind: 'anchor', subpathIndex, pointIndex });
    pushHistory();
    dragOrigin.current = {
      pointer: { x: e.clientX, y: e.clientY },
      subpaths: cloneSubpaths(shape.subpaths),
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onHandleDown = (
    e: ReactPointerEvent,
    subpathIndex: number,
    pointIndex: number,
    which: 'handleIn' | 'handleOut',
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!shape) return;
    setSelectedPathPoint({ subpathIndex, pointIndex });
    setDrag({ kind: which, subpathIndex, pointIndex });
    pushHistory();
    dragOrigin.current = {
      pointer: { x: e.clientX, y: e.clientY },
      subpaths: cloneSubpaths(shape.subpaths),
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag || !dragOrigin.current || !shape) return;
    const delta = screenDeltaToPath(
      e.clientX - dragOrigin.current.pointer.x,
      e.clientY - dragOrigin.current.pointer.y,
    );
    const next = cloneSubpaths(dragOrigin.current.subpaths);
    const pt = next[drag.subpathIndex]?.points[drag.pointIndex];
    if (!pt) return;

    if (drag.kind === 'anchor') {
      pt.anchor.x += delta.x;
      pt.anchor.y += delta.y;
    } else if (drag.kind === 'handleIn') {
      const abs = absHandle(pt.anchor, pt.handleIn);
      abs.x += delta.x;
      abs.y += delta.y;
      pt.handleIn = relativeHandle(pt.anchor, abs);
    } else {
      const abs = absHandle(pt.anchor, pt.handleOut);
      abs.x += delta.x;
      abs.y += delta.y;
      pt.handleOut = relativeHandle(pt.anchor, abs);
    }
    commitSubpaths(next, false);
  };

  const onPointerUp = () => {
    setDrag(null);
    dragOrigin.current = null;
  };

  const insertPointOnPath = (e: ReactPointerEvent<SVGPathElement>) => {
    e.stopPropagation();
    if (!shape) return;
    const local = toLocal(e, e.currentTarget.ownerSVGElement ?? e.currentTarget);
    // Hit threshold in path units (approximate via viewBox scale)
    const threshold =
      (HIT_THRESHOLD / zoom) * (viewBox.w / Math.max(1, shape.width));

    let best: {
      dist: number;
      subpathIndex: number;
      segmentIndex: number;
      t: number;
      mid: Point;
      leftC1: Point;
      leftC2: Point;
      rightC1: Point;
      rightC2: Point;
    } | null = null;

    for (let si = 0; si < shape.subpaths.length; si++) {
      const sp = shape.subpaths[si]!;
      const n = sp.points.length;
      const segs = sp.closed ? n : n - 1;
      for (let i = 0; i < segs; i++) {
        const a = sp.points[i]!;
        const b = sp.points[(i + 1) % n]!;
        const c1 = absHandle(a.anchor, a.handleOut);
        const c2 = absHandle(b.anchor, b.handleIn);
        const near = nearestPointOnCubic(a.anchor, c1, c2, b.anchor, local);
        if (near.dist < threshold && (!best || near.dist < best.dist)) {
          const split = splitCubicAt(a.anchor, c1, c2, b.anchor, near.t);
          best = {
            dist: near.dist,
            subpathIndex: si,
            segmentIndex: i,
            t: near.t,
            mid: split.mid,
            leftC1: split.left.c1,
            leftC2: split.left.c2,
            rightC1: split.right.c1,
            rightC2: split.right.c2,
          };
        }
      }
    }

    if (!best) return;

    const hit = best;
    const next = cloneSubpaths(shape.subpaths);
    const sp = next[hit.subpathIndex]!;
    const a = sp.points[hit.segmentIndex]!;
    const bIndex = (hit.segmentIndex + 1) % sp.points.length;
    const b = sp.points[bIndex]!;

    a.handleOut = relativeHandle(a.anchor, hit.leftC1);
    const newPt: PathPoint = {
      anchor: { ...hit.mid },
      handleIn: relativeHandle(hit.mid, hit.leftC2),
      handleOut: relativeHandle(hit.mid, hit.rightC1),
    };
    b.handleIn = relativeHandle(b.anchor, hit.rightC2);

    const insertAt = hit.segmentIndex + 1;
    sp.points.splice(insertAt, 0, newPt);
    commitSubpaths(next, true);
    setSelectedPathPoint({
      subpathIndex: hit.subpathIndex,
      pointIndex: insertAt,
    });
  };

  if (!shape || !pathEditObjectId) return null;

  return (
    <svg
      className="path-editor"
      width="100%"
      height="100%"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        overflow: 'visible',
        pointerEvents: 'auto',
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_THRESHOLD / zoom}
        style={{ pointerEvents: 'stroke', cursor: 'copy' }}
        onPointerDown={insertPointOnPath}
      />
      <path
        d={d}
        fill="none"
        stroke="var(--c-green-400, #3ecf8e)"
        strokeWidth={1 / zoom}
        style={{ pointerEvents: 'none' }}
      />

      {shape.subpaths.map((sp, si) =>
        sp.points.map((pt, pi) => {
          const selected =
            selectedPathPoint?.subpathIndex === si &&
            selectedPathPoint?.pointIndex === pi;
          const hi = absHandle(pt.anchor, pt.handleIn);
          const ho = absHandle(pt.anchor, pt.handleOut);
          const showHandles =
            selected ||
            Math.hypot(pt.handleIn.x, pt.handleIn.y) > 0.5 ||
            Math.hypot(pt.handleOut.x, pt.handleOut.y) > 0.5;

          return (
            <g key={`${si}-${pi}`} className="path-editor-point">
              {showHandles ? (
                <>
                  <line
                    x1={pt.anchor.x}
                    y1={pt.anchor.y}
                    x2={hi.x}
                    y2={hi.y}
                    stroke="#888"
                    strokeWidth={1 / zoom}
                    style={{ pointerEvents: 'none' }}
                  />
                  <line
                    x1={pt.anchor.x}
                    y1={pt.anchor.y}
                    x2={ho.x}
                    y2={ho.y}
                    stroke="#888"
                    strokeWidth={1 / zoom}
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle
                    cx={hi.x}
                    cy={hi.y}
                    r={4 / zoom}
                    fill="#fff"
                    stroke="#555"
                    strokeWidth={1 / zoom}
                    className="path-handle path-handle-in"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) => onHandleDown(e, si, pi, 'handleIn')}
                  />
                  <circle
                    cx={ho.x}
                    cy={ho.y}
                    r={4 / zoom}
                    fill="#fff"
                    stroke="#555"
                    strokeWidth={1 / zoom}
                    className="path-handle path-handle-out"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) => onHandleDown(e, si, pi, 'handleOut')}
                  />
                </>
              ) : null}
              <rect
                x={pt.anchor.x - 4 / zoom}
                y={pt.anchor.y - 4 / zoom}
                width={8 / zoom}
                height={8 / zoom}
                fill={selected ? 'var(--c-green-400, #3ecf8e)' : '#fff'}
                stroke="var(--c-green-400, #3ecf8e)"
                strokeWidth={1.5 / zoom}
                className="path-anchor"
                style={{ cursor: 'move' }}
                onPointerDown={(e) => onAnchorDown(e, si, pi)}
              />
            </g>
          );
        }),
      )}
    </svg>
  );
}

/** Remove selected path point(s); keeps at least 2 points per subpath. */
export function deleteSelectedPathPoints(): boolean {
  const { pathEditObjectId, selectedPathPoint, setSelectedPathPoint } =
    useEditorStore.getState();
  if (!pathEditObjectId || !selectedPathPoint) return false;

  const doc = useDocumentStore.getState();
  const obj = doc.objects[pathEditObjectId];
  if (!obj || obj.type !== 'shape') return false;

  const next = cloneSubpaths(obj.subpaths);
  const sp = next[selectedPathPoint.subpathIndex];
  if (!sp || sp.points.length <= 2) return false;

  sp.points.splice(selectedPathPoint.pointIndex, 1);
  doc.updateObject(pathEditObjectId, { subpaths: next } as Partial<ShapeObject>);
  setSelectedPathPoint(null);
  return true;
}
