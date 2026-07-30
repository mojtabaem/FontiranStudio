import { useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { HexColorPicker } from 'react-colorful';
import { NumberInput } from '@/components/NumberInput';
import { useDocumentStore } from '@/document/documentStore';
import type { Appearance, CanvasObject } from '@/document/types';

function normalizeHex(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1]!;
    const g = v[2]!;
    const b = v[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`.toUpperCase();
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`.toUpperCase();
  }
  return null;
}

function ColorField({
  label,
  value,
  mixed,
  onChange,
}: {
  label: string;
  value: string;
  mixed: boolean;
  onChange: (hex: string) => void;
}) {
  const display = mixed ? '' : value;
  const swatch = mixed ? 'transparent' : value === 'transparent' ? '#ffffff' : value;

  return (
    <div className="input-control input-size-s input-field appearance-color-field">
      <div className="label">
        <div className="text">{label}</div>
      </div>
      <Popover.Root>
        <div className="input-wrapper appearance-color-row">
          <Popover.Trigger asChild>
            <button
              type="button"
              className="appearance-swatch"
              style={{ backgroundColor: swatch }}
              aria-label={label}
            />
          </Popover.Trigger>
          <input
            className="input appearance-hex-input"
            value={display}
            placeholder={mixed ? 'mix' : '#000000'}
            onChange={(e) => {
              const next = normalizeHex(e.target.value);
              if (next) onChange(next);
            }}
            spellCheck={false}
          />
        </div>
        <Popover.Portal>
          <Popover.Content
            className="appearance-color-popover"
            sideOffset={6}
            align="start"
          >
            <HexColorPicker
              color={value === 'transparent' ? '#000000' : value || '#000000'}
              onChange={(hex) => onChange(hex.toUpperCase())}
            />
            <Popover.Arrow className="appearance-popover-arrow" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function sharedAppearanceValue<K extends keyof Appearance>(
  selected: CanvasObject[],
  key: K,
): { value: Appearance[K]; mixed: boolean } {
  const first = selected[0]!.appearance[key];
  for (let i = 1; i < selected.length; i++) {
    if (selected[i]!.appearance[key] !== first) {
      return { value: first, mixed: true };
    }
  }
  return { value: first, mixed: false };
}

export function AppearancePanel({ selected }: { selected: CanvasObject[] }) {
  const updateObject = useDocumentStore((s) => s.updateObject);

  const fill = useMemo(() => sharedAppearanceValue(selected, 'fill'), [selected]);
  const stroke = useMemo(() => sharedAppearanceValue(selected, 'stroke'), [selected]);
  const strokeWidth = useMemo(
    () => sharedAppearanceValue(selected, 'strokeWidth'),
    [selected],
  );
  const opacity = useMemo(() => sharedAppearanceValue(selected, 'opacity'), [selected]);

  const patchAppearance = (patch: Partial<Appearance>) => {
    for (const obj of selected) {
      updateObject(obj.id, { appearance: patch } as Partial<CanvasObject>);
    }
  };

  const opacityPct = Math.round((opacity.value as number) * 100);

  return (
    <div className="panel-group panel-appearance">
      <div className="panel-group-header">Appearance</div>
      <div className="panel-group-content">
        <div className="panel-row">
          <div className="col-8">
            <ColorField
              label="Fill"
              value={String(fill.value)}
              mixed={fill.mixed}
              onChange={(hex) => patchAppearance({ fill: hex })}
            />
          </div>
          <div className="col-4">
            <NumberInput
              controlClassName="input-control-opacity"
              label="Opacity"
              suffix="%"
              id="appearance-opacity"
              value={opacity.mixed ? '' : opacityPct}
              placeholder={opacity.mixed ? 'mix' : undefined}
              onChange={(pct) => {
                const clamped = Math.min(100, Math.max(0, pct));
                patchAppearance({ opacity: clamped / 100 });
              }}
              step={1}
              min={0}
              max={100}
            />
          </div>
        </div>
        <div className="panel-row">
          <div className="col-8">
            <ColorField
              label="Stroke"
              value={String(stroke.value)}
              mixed={stroke.mixed}
              onChange={(hex) => patchAppearance({ stroke: hex })}
            />
          </div>
          <div className="col-4">
            <NumberInput
              controlClassName="input-control-stroke-width"
              label="Width"
              suffix="px"
              id="appearance-stroke-width"
              value={strokeWidth.mixed ? '' : strokeWidth.value}
              placeholder={strokeWidth.mixed ? 'mix' : undefined}
              onChange={(w) => patchAppearance({ strokeWidth: Math.max(0, w) })}
              step={0.5}
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
