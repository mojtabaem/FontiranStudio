import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '@/components/Icon';
import { Tooltip } from '@/components/Tooltip';
import { useAuthStore } from '@/auth/authStore';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import type { CanvasObject, ShapeObject, TextObject } from '@/document/types';
import { getFontBuffer } from '@/fonts/fontBufferCache';
import { convertTextObjectToShape } from '@/fonts/textToPath';

export interface ObjectActionsProps {
  object: CanvasObject;
}

function placeholderShape(obj: TextObject): ShapeObject {
  const w = Math.max(1, obj.width);
  const h = Math.max(1, obj.height);
  return {
    id: obj.id,
    type: 'shape',
    name: obj.name,
    x: obj.x,
    y: obj.y,
    width: w,
    height: h,
    rotation: obj.rotation,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    visible: obj.visible,
    appearance: { ...obj.appearance },
    subpaths: [
      {
        closed: true,
        points: [
          { anchor: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
          { anchor: { x: w, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
          { anchor: { x: w, y: h }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
          { anchor: { x: 0, y: h }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
        ],
      },
    ],
  };
}

function faceUrlFor(faceId: string): string | undefined {
  const fonts = useAuthStore.getState().fonts;
  for (const family of fonts) {
    const face = family.faces.find((f) => f.id === faceId);
    if (face?.url) return face.url;
  }
  return undefined;
}

export function ObjectActions({ object }: ObjectActionsProps) {
  const copySelection = useDocumentStore((s) => s.copySelection);
  const duplicateSelection = useDocumentStore((s) => s.duplicateSelection);
  const cutSelection = useDocumentStore((s) => s.cutSelection);
  const deleteObjects = useDocumentStore((s) => s.deleteObjects);
  const updateObject = useDocumentStore((s) => s.updateObject);
  const convertTextToShape = useDocumentStore((s) => s.convertTextToShape);
  const select = useDocumentStore((s) => s.select);
  const openDialog = useEditorStore((s) => s.openDialog);
  const setExportTarget = useEditorStore((s) => s.setExportTarget);
  const showToast = useEditorStore((s) => s.showToast);
  const setPathEditObjectId = useEditorStore((s) => s.setPathEditObjectId);
  const setSelectedPathPoint = useEditorStore((s) => s.setSelectedPathPoint);
  const setTool = useEditorStore((s) => s.setTool);

  const stop = (e: ReactPointerEvent | MouseEvent) => {
    e.stopPropagation();
  };

  const enterPathEdit = (id: string) => {
    setPathEditObjectId(id);
    setSelectedPathPoint(null);
    setTool('path');
    select([id]);
  };

  const onFlipH = () => {
    updateObject(object.id, {
      scaleX: (object.scaleX || 1) * -1,
    } as Partial<CanvasObject>);
  };

  const onExport = () => {
    setExportTarget(object.id);
    openDialog('export');
  };

  const onConvert = async () => {
    if (object.type !== 'text') return;
    if (!object.fontFaceId) {
      // Still allow placeholder conversion when no face is bound
      convertTextToShape(object.id, placeholderShape(object));
      enterPathEdit(object.id);
      showToast('تبدیل با مسیر موقت — فونت انتخاب نشده');
      return;
    }
    try {
      showToast('در حال تبدیل به شکل…');
      const buffer = await getFontBuffer(
        object.fontFaceId,
        faceUrlFor(object.fontFaceId),
      );
      const shape = await convertTextObjectToShape(object, buffer);
      convertTextToShape(object.id, shape);
      enterPathEdit(object.id);
      showToast('متن به شکل تبدیل شد');
    } catch (err) {
      console.error(err);
      convertTextToShape(object.id, placeholderShape(object));
      enterPathEdit(object.id);
      showToast('تبدیل با مسیر موقت انجام شد');
    }
  };

  return (
    <div className="object-actions" onPointerDown={stop} onClick={stop}>
      <div className="object-actions-list">
        <Tooltip content="Copy">
          <button
            type="button"
            className="object-action-btn object-action-btn-copy"
            onClick={copySelection}
          >
            <Icon name="copy" />
          </button>
        </Tooltip>
        <Tooltip content="Duplicate">
          <button
            type="button"
            className="object-action-btn object-action-btn-duplicate"
            onClick={duplicateSelection}
          >
            <Icon name="duplicate" />
          </button>
        </Tooltip>
        <Tooltip content="Cut">
          <button
            type="button"
            className="object-action-btn object-action-btn-cut"
            onClick={cutSelection}
          >
            <Icon name="cut" />
          </button>
        </Tooltip>
        <Tooltip content="Flip">
          <button
            type="button"
            className="object-action-btn object-action-btn-flip-horizontal"
            onClick={onFlipH}
          >
            <Icon name="flip-h" />
          </button>
        </Tooltip>
        <div className="object-action-divider" />
        <Tooltip content="Export">
          <button
            type="button"
            className="object-action-btn object-action-btn-export"
            onClick={onExport}
          >
            <Icon name="export" />
          </button>
        </Tooltip>
        <Tooltip content="Delete">
          <button
            type="button"
            className="object-action-btn object-action-btn-delete"
            onClick={() => deleteObjects([object.id])}
          >
            <Icon name="trash" />
          </button>
        </Tooltip>
        {object.type === 'text' ? (
          <>
            <div className="object-action-divider" />
            <Tooltip content="Convert to Shape">
              <button
                type="button"
                className="object-action-btn object-action-btn-convert"
                onClick={() => {
                  void onConvert();
                }}
              >
                <div className="text">convert to shape</div>
                <Icon name="convert-to-shape" />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="object-action-divider" />
            <Tooltip content="Edit path">
              <button
                type="button"
                className="object-action-btn"
                onClick={() => enterPathEdit(object.id)}
              >
                <Icon name="controls" />
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}
