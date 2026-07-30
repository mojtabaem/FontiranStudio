import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { NumberInput } from '@/components/NumberInput';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import type { CanvasObject, TextObject } from '@/document/types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/document/types';
import { AppearancePanel } from './AppearancePanel';
import { TypographyPanel } from './TypographyPanel';

function sharedNumeric(
  items: CanvasObject[],
  get: (o: CanvasObject) => number,
): { value: number | ''; mixed: boolean } {
  if (items.length === 0) return { value: '', mixed: false };
  const first = get(items[0]!);
  const mixed = items.some((o) => get(o) !== first);
  return mixed ? { value: '', mixed: true } : { value: first, mixed: false };
}

export function PropertyPanel() {
  const [expanded, setExpanded] = useState(true);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const objects = useDocumentStore((s) => s.objects);
  const updateObject = useDocumentStore((s) => s.updateObject);
  const aspectRatioLocked = useDocumentStore((s) => s.aspectRatioLocked);
  const setDocAspectLock = useDocumentStore((s) => s.setAspectRatioLocked);
  const setEditorAspectLock = useEditorStore((s) => s.setAspectRatioLocked);

  const selected = useMemo(() => {
    return selectedIds
      .map((id) => objects[id])
      .filter((o): o is CanvasObject => Boolean(o));
  }, [selectedIds, objects]);

  const textSelected = useMemo(
    () => selected.filter((o): o is TextObject => o.type === 'text'),
    [selected],
  );

  const xField = sharedNumeric(selected, (o) => o.x);
  const yField = sharedNumeric(selected, (o) => o.y);
  const rotField = sharedNumeric(selected, (o) => o.rotation);
  const wField = sharedNumeric(selected, (o) => o.width);
  const hField = sharedNumeric(selected, (o) => o.height);

  const setAspectLock = (locked: boolean) => {
    setDocAspectLock(locked);
    setEditorAspectLock(locked);
  };

  const patchAll = (patch: Partial<CanvasObject>, opts?: { history?: boolean }) => {
    for (const obj of selected) {
      updateObject(obj.id, patch, opts);
    }
  };

  const onWidthChange = (width: number) => {
    for (const obj of selected) {
      if (aspectRatioLocked && obj.height > 0 && obj.width > 0) {
        const ratio = obj.height / obj.width;
        updateObject(obj.id, { width, height: width * ratio });
      } else {
        updateObject(obj.id, { width });
      }
    }
  };

  const onHeightChange = (height: number) => {
    for (const obj of selected) {
      if (aspectRatioLocked && obj.height > 0 && obj.width > 0) {
        const ratio = obj.width / obj.height;
        updateObject(obj.id, { height, width: height * ratio });
      } else {
        updateObject(obj.id, { height });
      }
    }
  };

  const widthPct =
    !wField.mixed && typeof wField.value === 'number'
      ? Math.round((wField.value / CANVAS_WIDTH) * 1000) / 10
      : '';
  const heightPct =
    !hField.mixed && typeof hField.value === 'number'
      ? Math.round((hField.value / CANVAS_HEIGHT) * 1000) / 10
      : '';

  return (
    <div
      className={`side-panel property-panel ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      id="property-panel"
    >
      <div className="side-panel-header">
        <div className="side-panel-header-title">
          <div className="text">تنظیمات</div>
          <Icon name="controls" />
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
          {selected.length === 0 ? (
            <div
              className="panel-empty-state"
              style={{ padding: 12, color: 'var(--c-gray-600)', fontSize: 13 }}
            >
              یک لایه را انتخاب کنید
            </div>
          ) : (
            <>
              <div className="panel-group panel-position">
                <div className="panel-group-header">Position</div>
                <div className="panel-group-content">
                  <div className="panel-row">
                    <div className="col-8">
                      <div className="input-group">
                        <NumberInput
                          controlClassName="input-control-position-x"
                          label="X"
                          suffix="px"
                          id="position-x"
                          value={xField.value}
                          placeholder={xField.mixed ? 'mix' : undefined}
                          onChange={(x) => patchAll({ x } as Partial<CanvasObject>)}
                          step={1}
                        />
                        <NumberInput
                          controlClassName="input-control-position-y"
                          label="Y"
                          suffix="px"
                          id="position-y"
                          value={yField.value}
                          placeholder={yField.mixed ? 'mix' : undefined}
                          onChange={(y) => patchAll({ y } as Partial<CanvasObject>)}
                          step={1}
                        />
                      </div>
                    </div>
                    <div className="col-4">
                      <NumberInput
                        controlClassName="input-control-rotation"
                        label={<Icon name="s-angle" />}
                        suffix="o"
                        id="position-rotation"
                        value={rotField.value}
                        placeholder={rotField.mixed ? 'mix' : undefined}
                        onChange={(rotation) =>
                          patchAll({ rotation } as Partial<CanvasObject>)
                        }
                        step={0.1}
                        min={0}
                        max={360}
                      />
                    </div>
                  </div>
                  <div className="panel-row">
                    <div className="col-8">
                      <div className="input-group">
                        <NumberInput
                          controlClassName="input-control-width"
                          label="Width"
                          suffix="px"
                          id="width"
                          value={wField.value}
                          placeholder={wField.mixed ? 'mix' : undefined}
                          onChange={onWidthChange}
                          step={0.1}
                          min={0}
                        />
                        <NumberInput
                          controlClassName="input-control-height"
                          label="Height"
                          suffix="px"
                          id="height"
                          value={hField.value}
                          placeholder={hField.mixed ? 'mix' : undefined}
                          onChange={onHeightChange}
                          step={0.1}
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="input-group">
                        <NumberInput
                          controlClassName="input-control-width-percentage"
                          label="%"
                          id="width-percentage"
                          value={widthPct}
                          placeholder={wField.mixed ? 'mix' : undefined}
                          onChange={(pct) => onWidthChange((pct / 100) * CANVAS_WIDTH)}
                          step={1}
                          min={0}
                          max={100}
                        />
                        <NumberInput
                          controlClassName="input-control-height-percentage"
                          label=" "
                          id="height-percentage"
                          value={heightPct}
                          placeholder={hField.mixed ? 'mix' : undefined}
                          onChange={(pct) =>
                            onHeightChange((pct / 100) * CANVAS_HEIGHT)
                          }
                          step={1}
                          min={0}
                          max={100}
                        />
                        <button
                          type="button"
                          className={`input-group-link-btn aspect-ratio-lock ${
                            aspectRatioLocked ? 'is-locked' : 'is-unlocked'
                          }`}
                          id="aspect-ratio-lock"
                          aria-pressed={aspectRatioLocked}
                          aria-label="قفل نسبت ابعاد"
                          onClick={() => setAspectLock(!aspectRatioLocked)}
                        >
                          <Icon name="aspect-lock-s" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Appearance + typography (when available) */}
              <AppearancePanel selected={selected} />
              {textSelected.length > 0 ? <TypographyPanel texts={textSelected} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
