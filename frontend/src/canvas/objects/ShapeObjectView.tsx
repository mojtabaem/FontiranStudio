import type { PointerEvent as ReactPointerEvent, MouseEvent } from 'react';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import type { ShapeObject } from '@/document/types';
import { usePointerTransform } from '@/hooks/usePointerTransform';
import { boundsOfSubpaths, subpathsToSvgD } from '@/canvas/pathUtils';
import { PathEditor } from '@/canvas/PathEditor';
import { SelectionChrome } from './SelectionChrome';

export interface ShapeObjectViewProps {
  object: ShapeObject;
  zIndex: number;
  selected: boolean;
  singleSelected: boolean;
  interactive: boolean;
  pathEditing?: boolean;
}

export function ShapeObjectView({
  object,
  zIndex,
  selected,
  singleSelected,
  interactive,
  pathEditing = false,
}: ShapeObjectViewProps) {
  const select = useDocumentStore((s) => s.select);
  const toggleSelect = useDocumentStore((s) => s.toggleSelect);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const setPathEditObjectId = useEditorStore((s) => s.setPathEditObjectId);
  const setSelectedPathPoint = useEditorStore((s) => s.setSelectedPathPoint);
  const setTool = useEditorStore((s) => s.setTool);
  const { beginMove } = usePointerTransform();

  const d = subpathsToSvgD(object.subpaths);
  const bounds = boundsOfSubpaths(object.subpaths);
  const vbX = bounds.width > 0 ? bounds.x : 0;
  const vbY = bounds.height > 0 ? bounds.y : 0;
  const vbW = bounds.width > 0 ? bounds.width : object.width || 1;
  const vbH = bounds.height > 0 ? bounds.height : object.height || 1;

  const enterPathEdit = () => {
    setPathEditObjectId(object.id);
    setSelectedPathPoint(null);
    setTool('path');
    select([object.id]);
  };

  const onSelectPointerDown = (e: ReactPointerEvent) => {
    if (!interactive || tool !== 'move' || pathEditing) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    if (e.shiftKey) {
      toggleSelect(object.id);
      return;
    }

    const ids = selectedIds.includes(object.id) ? selectedIds : [object.id];
    if (!selectedIds.includes(object.id)) {
      select([object.id]);
    }
    beginMove(e, ids);
  };

  const onDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    enterPathEdit();
  };

  const visibleClass = object.visible ? 'object-visible' : 'object-hidden';

  return (
    <div
      className={[
        'object',
        'object-shape',
        visibleClass,
        selected || pathEditing ? 'object-selected' : '',
        pathEditing ? 'is-path-edit' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`object-${object.id}`}
      data-object-type="shape"
      data-object-id={object.id}
      data-object-z-index={zIndex}
      style={{
        position: 'absolute',
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        transform: `rotate(${object.rotation}deg) scale(${object.scaleX}, ${object.scaleY})`,
        opacity: object.appearance.opacity,
        zIndex,
        pointerEvents: interactive || pathEditing ? 'auto' : 'none',
      }}
      onPointerDown={onSelectPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="object-wrapper">
        <div className="object-content">
          <svg
            className="object-shape-svg"
            width="100%"
            height="100%"
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            preserveAspectRatio="none"
          >
            <path
              d={d}
              fill={
                object.appearance.fill === 'transparent'
                  ? 'none'
                  : object.appearance.fill
              }
              stroke={
                object.appearance.stroke === 'transparent'
                  ? 'none'
                  : object.appearance.stroke
              }
              strokeWidth={object.appearance.strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        {pathEditing ? <PathEditor /> : null}
        {selected && singleSelected && !pathEditing ? (
          <SelectionChrome object={object} showHandles showActions zoom={zoom} />
        ) : null}
      </div>
    </div>
  );
}
