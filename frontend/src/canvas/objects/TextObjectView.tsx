import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useAuthStore } from '@/auth/authStore';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import type { TextObject } from '@/document/types';
import { getCssFamilyName } from '@/fonts/fontManager';
import { usePointerTransform } from '@/hooks/usePointerTransform';
import { SelectionChrome } from './SelectionChrome';

export interface TextObjectViewProps {
  object: TextObject;
  zIndex: number;
  selected: boolean;
  singleSelected: boolean;
  interactive: boolean;
}

function featuresToCss(features: Record<string, boolean>): string | undefined {
  const parts = Object.entries(features)
    .filter(([, on]) => on)
    .map(([tag]) => `"${tag}" 1`);
  return parts.length ? parts.join(', ') : undefined;
}

function axesToCss(axes: Record<string, number>): string | undefined {
  const parts = Object.entries(axes).map(([tag, value]) => `"${tag}" ${value}`);
  return parts.length ? parts.join(', ') : undefined;
}

export function TextObjectView({
  object,
  zIndex,
  selected,
  singleSelected,
  interactive,
}: TextObjectViewProps) {
  const fonts = useAuthStore((s) => s.fonts);
  const select = useDocumentStore((s) => s.select);
  const toggleSelect = useDocumentStore((s) => s.toggleSelect);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const updateObject = useDocumentStore((s) => s.updateObject);
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const editingTextId = useEditorStore((s) => s.editingTextId);
  const setEditingTextId = useEditorStore((s) => s.setEditingTextId);
  const { beginMove } = usePointerTransform();

  const editing = editingTextId === object.id;
  const editRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(object.text);
  const skipBlurCommit = useRef(false);

  const family = fonts.find((f) => f.id === object.fontFamilyId);
  const cssName = object.fontFamilyId
    ? getCssFamilyName(object.fontFamilyId)
    : null;
  const cssFamily = cssName
    ? `"${cssName}", ${family?.name ? `"${family.name}", ` : ''}dana, sans-serif`
    : family?.name
      ? `"${family.name}", dana, sans-serif`
      : 'dana, sans-serif';

  const textStyle: CSSProperties = {
    fontFamily: cssFamily,
    fontSize: object.fontSize,
    fontWeight: object.fontWeight,
    fontFeatureSettings: featuresToCss(object.features),
    fontVariationSettings: axesToCss(object.variableAxes),
    color: object.appearance.fill,
    opacity: object.appearance.opacity,
    letterSpacing: object.letterSpacing,
    whiteSpace: 'nowrap',
    direction: 'rtl',
    lineHeight: 1,
    userSelect: editing ? 'text' : 'none',
    outline: 'none',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  };

  useEffect(() => {
    if (!editing) {
      setDraft(object.text);
      return;
    }
    setDraft(object.text);
    const el = editRef.current;
    if (!el) return;
    el.textContent = object.text;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // only sync when entering edit mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commitEdit = (value: string) => {
    setEditingTextId(null);
    if (value !== object.text) {
      updateObject(object.id, { text: value } as Partial<TextObject>);
    }
  };

  const cancelEdit = () => {
    skipBlurCommit.current = true;
    setEditingTextId(null);
    setDraft(object.text);
    if (editRef.current) editRef.current.textContent = object.text;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(editRef.current?.textContent ?? draft);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const onSelectPointerDown = (e: ReactPointerEvent) => {
    if (!interactive || tool !== 'move' || editing) return;
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
    if (!interactive) return;
    e.stopPropagation();
    select([object.id]);
    setEditingTextId(object.id);
  };

  const visibleClass = object.visible ? 'object-visible' : 'object-hidden';

  return (
    <div
      className={[
        'object',
        'object-text',
        visibleClass,
        selected ? 'object-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`object-${object.id}`}
      data-object-type="text"
      data-object-id={object.id}
      data-object-z-index={zIndex}
      style={{
        position: 'absolute',
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        transform: `rotate(${object.rotation}deg) scale(${object.scaleX}, ${object.scaleY})`,
        zIndex,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onPointerDown={onSelectPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="object-wrapper">
        <div className="object-content">
          {editing ? (
            <div
              ref={editRef}
              className="object-text-content is-editing"
              style={textStyle}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={onKeyDown}
              onBlur={() => {
                if (skipBlurCommit.current) {
                  skipBlurCommit.current = false;
                  return;
                }
                commitEdit(editRef.current?.textContent ?? draft);
              }}
              onInput={() => setDraft(editRef.current?.textContent ?? '')}
            />
          ) : (
            <div className="object-text-content" style={textStyle}>
              {object.text}
            </div>
          )}
        </div>
        {selected && singleSelected ? (
          <SelectionChrome
            object={object}
            showHandles
            showActions
            zoom={zoom}
          />
        ) : null}
      </div>
    </div>
  );
}
