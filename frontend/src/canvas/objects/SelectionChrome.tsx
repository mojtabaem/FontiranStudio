import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasObject } from '@/document/types';
import {
  usePointerTransform,
  type HandleDir,
} from '@/hooks/usePointerTransform';
import { ObjectActions } from './ObjectActions';

export interface SelectionChromeProps {
  object: CanvasObject;
  /** Show resize/rotate handles (single selection only) */
  showHandles: boolean;
  /** Show actions bar (single selection only) */
  showActions: boolean;
  /** Reserved for screen-space handle thresholds */
  zoom?: number;
}

const CORNERS: { dir: HandleDir; className: string }[] = [
  { dir: 'ne', className: 'corner corner-top-right' },
  { dir: 'se', className: 'corner corner-bottom-right' },
  { dir: 'sw', className: 'corner corner-bottom-left' },
  { dir: 'nw', className: 'corner corner-top-left' },
];

const EDGES: { dir: HandleDir; className: string; axis: 'h' | 'v' }[] = [
  { dir: 'n', className: 'handle handle-top', axis: 'h' },
  { dir: 's', className: 'handle handle-bottom', axis: 'h' },
  { dir: 'w', className: 'handle handle-left', axis: 'v' },
  { dir: 'e', className: 'handle handle-right', axis: 'v' },
];

export function SelectionChrome({
  object,
  showHandles,
  showActions,
}: SelectionChromeProps) {
  const outlineRef = useRef<HTMLDivElement>(null);
  const { beginResize, beginRotate } = usePointerTransform();

  // Hide edge handles when scaled size is under 40 (artboard units)
  const scaledW = Math.abs(object.width * object.scaleX);
  const scaledH = Math.abs(object.height * object.scaleY);
  const showNS = scaledW >= 40;
  const showEW = scaledH >= 40;

  const onCornerDown = (e: ReactPointerEvent, dir: HandleDir) => {
    // Near-corner drag with Alt starts rotate; otherwise resize
    if (e.altKey) {
      const el = outlineRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      beginRotate(e, object.id, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      return;
    }
    beginResize(e, object.id, dir);
  };

  const onRotateDown = (e: ReactPointerEvent) => {
    const el = outlineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    beginRotate(e, object.id, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  return (
    <>
      <div className="object-outline" ref={outlineRef}>
        {showHandles ? (
          <div className="object-outline-controls">
            {CORNERS.map(({ dir, className }) => (
              <div
                key={dir}
                className={className}
                data-handle={dir}
                onPointerDown={(e) => onCornerDown(e, dir)}
              />
            ))}
            {EDGES.map(({ dir, className, axis }) => {
              if (axis === 'h' && !showNS) return null;
              if (axis === 'v' && !showEW) return null;
              return (
                <div
                  key={dir}
                  className={className}
                  data-handle={dir}
                  onPointerDown={(e) => beginResize(e, object.id, dir)}
                />
              );
            })}
            <div
              className="handle handle-rotate"
              title="Rotate"
              onPointerDown={onRotateDown}
            />
          </div>
        ) : null}
      </div>
      {showActions ? <ObjectActions object={object} /> : null}
    </>
  );
}
