import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';

export function LayersPanel() {
  const [expanded, setExpanded] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  const order = useDocumentStore((s) => s.order);
  const objects = useDocumentStore((s) => s.objects);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const select = useDocumentStore((s) => s.select);
  const toggleSelect = useDocumentStore((s) => s.toggleSelect);
  const rename = useDocumentStore((s) => s.rename);
  const setVisibility = useDocumentStore((s) => s.setVisibility);
  const deleteObjects = useDocumentStore((s) => s.deleteObjects);
  const moveObjectOrder = useDocumentStore((s) => s.moveObjectOrder);
  const setExportTarget = useEditorStore((s) => s.setExportTarget);
  const openDialog = useEditorStore((s) => s.openDialog);

  // Display top-most first (reverse of z-order)
  const layers = useMemo(() => [...order].reverse(), [order]);

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const fromIndex = order.indexOf(dragId);
    const toIndex = order.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDragId(null);
      return;
    }
    moveObjectOrder(dragId, toIndex);
    setDragId(null);
  };

  return (
    <div
      className={`side-panel layers-panel ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      id="layers-panel"
    >
      <div className="side-panel-header">
        <div className="side-panel-header-title">
          <div className="text">لایه‌ها</div>
          <Icon name="layer" />
        </div>
        <div className="side-panel-header-action">
          <button
            type="button"
            className="panel-size-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'جمع کردن پنل' : 'باز کردن پنل'}
          >
            <Icon name="x" className="is-expanded" />
            <Icon name="chevron-up" className="is-collapsed" />
          </button>
        </div>
      </div>
      <div className="side-panel-content">
        <div className="panel-content-inner">
          <div className="layers-stream" id="layers-stream">
            {layers.length === 0 ? (
              <div style={{ padding: 8, fontSize: 12, color: 'var(--c-gray-600)' }}>
                لایه‌ای وجود ندارد
              </div>
            ) : null}
            {layers.map((id) => {
              const obj = objects[id];
              if (!obj) return null;
              const selected = selectedIds.includes(id);
              const visible = obj.visible;
              return (
                <div
                  key={id}
                  className={[
                    'layer-item',
                    obj.type === 'text' ? 'layer-text' : 'layer-shape',
                    visible ? 'is-visible' : 'is-hidden',
                    selected ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-layer-type={obj.type}
                  data-layer-id={id}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropOn(id)}
                  onClick={(e) => {
                    if (e.shiftKey) toggleSelect(id);
                    else select([id]);
                  }}
                >
                  <div className="layer-item-inner">
                    <div className="layer-item-lead">
                      <div className="layer-handle">
                        <Icon name="layer-grab" className="icon-grab" />
                      </div>
                      <div className="layer-icon">
                        <Icon
                          name={obj.type === 'text' ? 'layer-text' : 'layer-shape'}
                          className={obj.type === 'text' ? 'icon-text' : 'icon-shape'}
                        />
                      </div>
                      <div className="layer-name">
                        <input
                          className="layer-name-input"
                          id={`layer-name-input-${id}`}
                          type="text"
                          value={obj.name}
                          maxLength={20}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => rename(id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="layer-item-trail">
                      <button
                        type="button"
                        className="layer-item-btn layer-item-btn-export"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportTarget(id);
                          openDialog('export');
                        }}
                      >
                        <Icon name="export" className="icon-export" />
                      </button>
                      <button
                        type="button"
                        className="layer-item-btn layer-item-btn-eye"
                        aria-label={visible ? 'مخفی کردن لایه' : 'نمایش لایه'}
                        aria-pressed={visible}
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisibility(id, !visible);
                        }}
                      >
                        <Icon name="layer-eye" className="is-visible" />
                        <Icon name="layer-eye-close" className="is-hidden" />
                      </button>
                      <button
                        type="button"
                        className="layer-item-btn layer-item-btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteObjects([id]);
                        }}
                      >
                        <Icon name="layer-trash" className="icon-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
