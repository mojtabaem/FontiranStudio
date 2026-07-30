import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Viewport } from './Viewport';
import { SelectionMarquee } from './SelectionMarquee';
import { MultiSelectOverlay } from './SelectionOverlay';
import { TextObjectView } from './objects/TextObjectView';
import { ShapeObjectView } from './objects/ShapeObjectView';
import { clientToArtboard, objectAabb, rectsIntersect } from './coords';
import { useAuthStore } from '@/auth/authStore';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import { CANVAS_HEIGHT, CANVAS_WIDTH, MAX_LAYERS } from '@/document/types';

type MarqueeState = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  additive: boolean;
} | null;

export function Canvas() {
  const order = useDocumentStore((s) => s.order);
  const objects = useDocumentStore((s) => s.objects);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const select = useDocumentStore((s) => s.select);
  const clearSelection = useDocumentStore((s) => s.clearSelection);
  const addText = useDocumentStore((s) => s.addText);

  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const isSpacePanning = useEditorStore((s) => s.isSpacePanning);
  const setEditingTextId = useEditorStore((s) => s.setEditingTextId);
  const pathEditObjectId = useEditorStore((s) => s.pathEditObjectId);
  const setPathEditObjectId = useEditorStore((s) => s.setPathEditObjectId);
  const setSelectedPathPoint = useEditorStore((s) => s.setSelectedPathPoint);
  const showToast = useEditorStore((s) => s.showToast);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState>(null);
  const marqueeRef = useRef<MarqueeState>(null);

  const interactive = tool === 'move' && !isSpacePanning && !pathEditObjectId;
  const singleSelected = selectedIds.length === 1;

  const cursor =
    tool === 'hand' || isSpacePanning
      ? 'grab'
      : tool === 'text'
        ? 'text'
        : tool === 'path'
          ? 'crosshair'
          : 'default';

  const exitPathEdit = useCallback(() => {
    setPathEditObjectId(null);
    setSelectedPathPoint(null);
  }, [setPathEditObjectId, setSelectedPathPoint]);

  const multiBounds = useMemo(() => {
    if (selectedIds.length < 2 || pathEditObjectId) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of selectedIds) {
      const obj = objects[id];
      if (!obj || !obj.visible) continue;
      const b = objectAabb(obj);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [selectedIds, objects, pathEditObjectId]);

  const getViewportRect = useCallback(() => {
    const el = viewportRef.current ?? document.querySelector('.canvas-viewport');
    return (el as HTMLElement | null)?.getBoundingClientRect() ?? null;
  }, []);

  const toArtboard = useCallback(
    (clientX: number, clientY: number) => {
      const rect = getViewportRect();
      if (!rect) return { x: 0, y: 0 };
      return clientToArtboard(clientX, clientY, rect, panX, panY, zoom);
    },
    [getViewportRect, panX, panY, zoom],
  );

  const finishMarquee = useCallback(
    (state: MarqueeState) => {
      if (!state) return;
      const box = {
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
      };
      const hit =
        box.width < 2 && box.height < 2
          ? []
          : order.filter((id) => {
              const obj = objects[id];
              if (!obj || !obj.visible) return false;
              return rectsIntersect(box, objectAabb(obj));
            });

      if (hit.length === 0) {
        if (!state.additive) clearSelection();
      } else if (state.additive) {
        select(hit, { additive: true });
      } else {
        select(hit);
      }
    },
    [clearSelection, objects, order, select],
  );

  const onArtboardPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (isSpacePanning || tool === 'hand') return;
    if (e.target !== e.currentTarget) return;

    if (pathEditObjectId) {
      exitPathEdit();
      setTool('move');
      return;
    }

    const { x, y } = toArtboard(e.clientX, e.clientY);

    if (tool === 'text') {
      const fonts = useAuthStore.getState().fonts;
      const family = fonts[0];
      const face =
        family?.faces.find((f) => f.weight === 400) ?? family?.faces[0];
      const id = addText({
        x,
        y,
        text: 'متن',
        fontFamilyId: family?.id ?? '',
        fontFaceId: face?.id ?? '',
        fontWeight: face?.weight ?? 400,
        variableAxes:
          face?.isVariable && face.axes.length
            ? Object.fromEntries(face.axes.map((a) => [a.tag, a.default]))
            : {},
        features: {},
      });
      if (!id) {
        showToast(`حداکثر ${MAX_LAYERS} لایه مجاز است`);
        return;
      }
      setEditingTextId(id);
      setTool('move');
      return;
    }

    if (tool !== 'move') return;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    const next: MarqueeState = {
      startX: x,
      startY: y,
      x,
      y,
      width: 0,
      height: 0,
      additive: e.shiftKey,
    };
    marqueeRef.current = next;
    setMarquee(next);
  };

  const onArtboardPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = marqueeRef.current;
    if (!state) return;
    const { x, y } = toArtboard(e.clientX, e.clientY);
    const next: MarqueeState = {
      ...state,
      x: Math.min(state.startX, x),
      y: Math.min(state.startY, y),
      width: Math.abs(x - state.startX),
      height: Math.abs(y - state.startY),
    };
    marqueeRef.current = next;
    setMarquee(next);
  };

  const onArtboardPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = marqueeRef.current;
    if (!state) return;
    marqueeRef.current = null;
    setMarquee(null);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    finishMarquee(state);
  };

  return (
    <section
      className={['canvas', pathEditObjectId ? 'is-path-editing' : '']
        .filter(Boolean)
        .join(' ')}
      id="canvas"
      data-cursor={cursor}
      data-tool={tool}
    >
      <Viewport viewportRef={viewportRef}>
        <div
          className="canvas-artboard"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          }}
          onPointerDown={onArtboardPointerDown}
          onPointerMove={onArtboardPointerMove}
          onPointerUp={onArtboardPointerUp}
          onPointerCancel={onArtboardPointerUp}
        >
          {order.map((id, index) => {
            const obj = objects[id];
            if (!obj || !obj.visible) return null;
            const selected = selectedIds.includes(id);
            const zIndex = index + 1;
            const editingPath = pathEditObjectId === id;
            const showChrome = selected && singleSelected && !editingPath;

            if (obj.type === 'text') {
              return (
                <TextObjectView
                  key={id}
                  object={obj}
                  zIndex={zIndex}
                  selected={selected}
                  singleSelected={showChrome}
                  interactive={interactive}
                />
              );
            }

            return (
              <ShapeObjectView
                key={id}
                object={obj}
                zIndex={zIndex}
                selected={selected}
                singleSelected={showChrome}
                interactive={interactive && !editingPath}
                pathEditing={editingPath}
              />
            );
          })}

          {multiBounds && selectedIds.length > 1 ? (
            <MultiSelectOverlay
              x={multiBounds.x}
              y={multiBounds.y}
              width={multiBounds.width}
              height={multiBounds.height}
              selectedIds={selectedIds}
              interactive={interactive}
            />
          ) : null}

          {marquee && (marquee.width > 0 || marquee.height > 0) ? (
            <SelectionMarquee
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
            />
          ) : null}
        </div>
      </Viewport>
    </section>
  );
}
