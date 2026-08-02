import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useEditorStore } from '@/editor/editorStore';
import { MAX_ZOOM, MIN_ZOOM } from '@/document/types';
import {
  getPanEdges,
  zoomTowardCursor,
  type PanEdges,
} from '@/canvas/coords';

export interface ViewportProps {
  children: ReactNode;
  viewportRef?: RefObject<HTMLDivElement | null>;
}

const EMPTY_EDGES: PanEdges = {
  left: false,
  right: false,
  top: false,
  bottom: false,
};

export function Viewport({ children, viewportRef }: ViewportProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const viewportWidth = useEditorStore((s) => s.viewportWidth);
  const viewportHeight = useEditorStore((s) => s.viewportHeight);
  const setPan = useEditorStore((s) => s.setPan);
  const panBy = useEditorStore((s) => s.panBy);
  const setCamera = useEditorStore((s) => s.setCamera);
  const setViewportSize = useEditorStore((s) => s.setViewportSize);
  const isSpacePanning = useEditorStore((s) => s.isSpacePanning);
  const pathEditObjectId = useEditorStore((s) => s.pathEditObjectId);

  const draggingRef = useRef(false);
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );

  const [edges, setEdges] = useState<PanEdges>(EMPTY_EDGES);

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

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;

    const publish = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize(rect.width, rect.height);
    };

    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewportSize]);

  useEffect(() => {
    if (!viewportWidth || !viewportHeight) return;
    setEdges(getPanEdges(panX, panY, zoom, viewportWidth, viewportHeight));
  }, [panX, panY, zoom, viewportWidth, viewportHeight]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = localRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.0015;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const camera = zoomTowardCursor(
          nextZoom,
          zoom,
          cursorX,
          cursorY,
          panX,
          panY,
        );
        setCamera(camera);
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    },
    [zoom, panX, panY, setCamera, panBy],
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
    edges.left ? 'is-edge-left' : '',
    edges.right ? 'is-edge-right' : '',
    edges.top ? 'is-edge-top' : '',
    edges.bottom ? 'is-edge-bottom' : '',
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
      <div className="canvas-edge-veil" aria-hidden="true">
        <div className="edge-left" />
        <div className="edge-right" />
        <div className="edge-top" />
        <div className="edge-bottom" />
      </div>
    </div>
  );
}
