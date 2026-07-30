import type { PointerEvent as ReactPointerEvent } from 'react';
import { usePointerTransform } from '@/hooks/usePointerTransform';

export interface MultiSelectOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  selectedIds: string[];
  interactive: boolean;
}

/** Shared bounding box for multi-selection — move only. */
export function MultiSelectOverlay({
  x,
  y,
  width,
  height,
  selectedIds,
  interactive,
}: MultiSelectOverlayProps) {
  const { beginMove } = usePointerTransform();

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!interactive || e.button !== 0) return;
    beginMove(e, selectedIds);
  };

  return (
    <div
      className="multi-select-overlay object-outline"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: 10000,
        cursor: 'move',
      }}
      onPointerDown={onPointerDown}
    />
  );
}
