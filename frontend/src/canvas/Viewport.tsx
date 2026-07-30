import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useEditorStore } from '@/editor/editorStore';
import { MAX_ZOOM, MIN_ZOOM } from '@/document/types';

export interface ViewportProps {
  children: ReactNode;
  viewportRef?: RefObject<HTMLDivElement | null>;
}

export function Viewport({ children, viewportRef }: ViewportProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const setPan = useEditorStore((s) => s.setPan);
  const panBy = useEditorStore((s) => s.panBy);
  const isSpacePanning = useEditorStore((s) => s.isSpacePanning);
  const pathEditObjectId = useEditorStore((s) => s.pathEditObjectId);

  const draggingRef = useRef(false);
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );

  const canPan = tool === 'hand' || isSpacePanning;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (viewportRef) {
        (viewportRef as { current: HTMLDivElement | null }).current = node;
      }
    },
    [viewportRef],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.0015;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
        setZoom(next);
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    },
    [zoom, setZoom, panBy],
  );

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canPan || e.button !== 0) return;
    draggingRef.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY, panX, panY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.currentTarget.classList.add('is-dragging');
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    setPan(dragOrigin.current.panX + dx, dragOrigin.current.panY + dy);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    dragOrigin.current = null;
    e.currentTarget.classList.remove('is-dragging');
  };

  const cursorKind =
    isSpacePanning || tool === 'hand'
      ? 'grab'
      : tool === 'text'
        ? 'text'
        : tool === 'path' || pathEditObjectId
          ? 'crosshair'
          : 'default';

  const className = [
    'canvas-viewport',
    canPan ? 'is-panning' : '',
    isSpacePanning ? 'is-space-panning' : '',
    pathEditObjectId ? 'is-path-editing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setRefs}
      className={className}
      data-cursor={cursorKind}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  );
}
