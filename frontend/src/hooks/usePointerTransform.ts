import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasObject } from '@/document/types';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';

export type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type TransformMode = 'move' | 'resize' | 'rotate';

export interface TransformSession {
  mode: TransformMode;
  handle?: HandleDir;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  snapshots: Record<string, CanvasObject>;
  ids: string[];
  centerX: number;
  centerY: number;
  /** Screen-space center for rotation (client coords) */
  screenCenterX: number;
  screenCenterY: number;
  startAngle: number;
  startRotation: number;
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

function normalizeDeg(d: number) {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

function applyResize(
  snap: CanvasObject,
  handle: HandleDir,
  dx: number,
  dy: number,
  aspectLocked: boolean,
): Partial<CanvasObject> {
  let { x, y, width, height } = snap;
  const ratio = snap.width > 0 && snap.height > 0 ? snap.width / snap.height : 1;

  const fromLeft = handle.includes('w');
  const fromRight = handle.includes('e');
  const fromTop = handle.includes('n');
  const fromBottom = handle.includes('s');

  if (fromLeft) {
    const nextW = Math.max(1, width - dx);
    const applied = width - nextW;
    x = x + applied;
    width = nextW;
  } else if (fromRight) {
    width = Math.max(1, width + dx);
  }

  if (fromTop) {
    const nextH = Math.max(1, height - dy);
    const applied = height - nextH;
    y = y + applied;
    height = nextH;
  } else if (fromBottom) {
    height = Math.max(1, height + dy);
  }

  if (aspectLocked && (fromLeft || fromRight || fromTop || fromBottom)) {
    const isCorner = (fromLeft || fromRight) && (fromTop || fromBottom);
    const isHorizontalEdge = (fromLeft || fromRight) && !fromTop && !fromBottom;
    const isVerticalEdge = (fromTop || fromBottom) && !fromLeft && !fromRight;

    if (isCorner || isHorizontalEdge) {
      const nextH = Math.max(1, width / ratio);
      if (fromTop && !fromBottom) {
        y = snap.y + snap.height - nextH;
      }
      height = nextH;
    } else if (isVerticalEdge) {
      const nextW = Math.max(1, height * ratio);
      if (fromLeft && !fromRight) {
        x = snap.x + snap.width - nextW;
      }
      width = nextW;
    }
  }

  return { x, y, width, height };
}

/**
 * Reusable pointer-driven move / resize / rotate for canvas objects.
 * Push history once on pointerdown; updates use `history: false` during drag.
 */
export function usePointerTransform() {
  const sessionRef = useRef<TransformSession | null>(null);
  const updateObject = useDocumentStore((s) => s.updateObject);
  const pushHistory = useDocumentStore((s) => s.pushHistory);
  const aspectRatioLocked = useDocumentStore((s) => s.aspectRatioLocked);
  const zoom = useEditorStore((s) => s.zoom);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dx = (e.clientX - session.startClientX) / zoom;
      const dy = (e.clientY - session.startClientY) / zoom;

      if (session.mode === 'move') {
        for (const id of session.ids) {
          const snap = session.snapshots[id];
          if (!snap) continue;
          updateObject(
            id,
            { x: snap.x + dx, y: snap.y + dy } as Partial<CanvasObject>,
            { history: false },
          );
        }
        return;
      }

      const primaryId = session.ids[0];
      if (!primaryId) return;
      const snap = session.snapshots[primaryId];
      if (!snap) return;

      if (session.mode === 'resize' && session.handle) {
        const rad = degToRad(-(snap.rotation || 0));
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        const patch = applyResize(snap, session.handle, localDx, localDy, aspectRatioLocked);
        updateObject(primaryId, patch, { history: false });
        return;
      }

      if (session.mode === 'rotate') {
        const current = Math.atan2(
          e.clientY - session.screenCenterY,
          e.clientX - session.screenCenterX,
        );
        const delta = radToDeg(current - session.startAngle);
        updateObject(
          primaryId,
          { rotation: normalizeDeg(session.startRotation + delta) } as Partial<CanvasObject>,
          { history: false },
        );
      }
    },
    [aspectRatioLocked, updateObject, zoom],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      sessionRef.current = null;
    },
    [onPointerMove],
  );

  const attach = useCallback(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [onPointerMove, onPointerUp]);

  const beginMove = useCallback(
    (e: ReactPointerEvent, ids: string[]) => {
      if (e.button !== 0 || ids.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      const objects = useDocumentStore.getState().objects;
      const snapshots: Record<string, CanvasObject> = {};
      for (const id of ids) {
        const o = objects[id];
        if (o) snapshots[id] = structuredClone(o);
      }
      const primary = snapshots[ids[0]!];
      if (!primary) return;
      pushHistory();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      sessionRef.current = {
        mode: 'move',
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        snapshots,
        ids,
        centerX: primary.x + primary.width / 2,
        centerY: primary.y + primary.height / 2,
        screenCenterX: 0,
        screenCenterY: 0,
        startAngle: 0,
        startRotation: primary.rotation,
      };
      attach();
    },
    [attach, pushHistory],
  );

  const beginResize = useCallback(
    (e: ReactPointerEvent, id: string, handle: HandleDir) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const objects = useDocumentStore.getState().objects;
      const obj = objects[id];
      if (!obj) return;
      pushHistory();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      sessionRef.current = {
        mode: 'resize',
        handle,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        snapshots: { [id]: structuredClone(obj) },
        ids: [id],
        centerX: obj.x + obj.width / 2,
        centerY: obj.y + obj.height / 2,
        screenCenterX: 0,
        screenCenterY: 0,
        startAngle: 0,
        startRotation: obj.rotation,
      };
      attach();
    },
    [attach, pushHistory],
  );

  const beginRotate = useCallback(
    (e: ReactPointerEvent, id: string, screenCenter: { x: number; y: number }) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const objects = useDocumentStore.getState().objects;
      const obj = objects[id];
      if (!obj) return;
      pushHistory();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const startAngle = Math.atan2(
        e.clientY - screenCenter.y,
        e.clientX - screenCenter.x,
      );
      sessionRef.current = {
        mode: 'rotate',
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        snapshots: { [id]: structuredClone(obj) },
        ids: [id],
        centerX: obj.x + obj.width / 2,
        centerY: obj.y + obj.height / 2,
        screenCenterX: screenCenter.x,
        screenCenterY: screenCenter.y,
        startAngle,
        startRotation: obj.rotation,
      };
      attach();
    },
    [attach, pushHistory],
  );

  const isDragging = useCallback(() => sessionRef.current != null, []);

  return {
    beginMove,
    beginResize,
    beginRotate,
    isDragging,
    sessionRef,
  };
}
