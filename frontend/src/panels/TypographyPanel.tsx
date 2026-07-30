import { useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import type { FontAxis, FontFaceMeta, FontFamilyMeta } from '@/auth/authStore';
import { NumberInput } from '@/components/NumberInput';
import { useDocumentStore } from '@/document/documentStore';
import type { TextObject } from '@/document/types';
import { useFonts } from '@/fonts/useFonts';

const FEATURE_LABELS: Record<string, string> = {
  liga: 'لیگاتور',
  clig: 'لیگاتور متنی',
  dlig: 'لیگاتور اختیاری',
  calt: 'جایگزینی زمینه‌ای',
  kern: 'کرنینگ',
  rlig: 'لیگاتور لازم',
  locl: 'اشکال محلی',
  salt: 'جایگزین سبکی',
  swsh: 'سووش',
  hist: 'اشکال تاریخی',
  onum: 'ارقام قدیمی',
  lnum: 'ارقام هم‌ارتفاع',
  tnum: 'ارقام جدولی',
  pnum: 'ارقام متناسب',
  smcp: 'حروف کوچک',
  c2sc: 'کپیتال به کوچک',
  case: 'اشکال حروف بزرگ',
  init: 'اشکال آغازین',
  medi: 'اشکال میانی',
  fina: 'اشکال پایانی',
  isol: 'اشکال جدا',
  mark: 'جای‌گذاری علامت',
  mkmk: 'علامت روی علامت',
  ccmp: 'ترکیب گلیف',
  curs: 'اتصال شکسته',
};

for (let i = 1; i <= 20; i++) {
  const tag = `ss${String(i).padStart(2, '0')}`;
  FEATURE_LABELS[tag] = `سبک جایگزین ${i}`;
}
for (let i = 1; i <= 99; i++) {
  const tag = `cv${String(i).padStart(2, '0')}`;
  FEATURE_LABELS[tag] = `کاراکتر جایگزین ${i}`;
}

const AXIS_LABELS: Record<string, string> = {
  wght: 'وزن',
  wdth: 'عرض',
  slnt: 'شیب',
  ital: 'ایتالیک',
  opsz: 'اندازه نوری',
};

function featureLabel(tag: string): string {
  return FEATURE_LABELS[tag] ?? tag;
}

function axisLabel(axis: FontAxis): string {
  return AXIS_LABELS[axis.tag] ?? axis.name ?? axis.tag;
}

function sharedValue<T>(
  items: T[],
  get: (item: T) => unknown,
): { value: unknown; mixed: boolean } {
  if (items.length === 0) return { value: undefined, mixed: false };
  const first = get(items[0]!);
  for (let i = 1; i < items.length; i++) {
    const next = get(items[i]!);
    if (next !== first) {
      return { value: first, mixed: true };
    }
  }
  return { value: first, mixed: false };
}

function findFamily(
  families: FontFamilyMeta[],
  familyId: string,
): FontFamilyMeta | undefined {
  return families.find((f) => f.id === familyId);
}

function findFace(
  family: FontFamilyMeta | undefined,
  faceId: string,
): FontFaceMeta | undefined {
  return family?.faces.find((f) => f.id === faceId);
}

function defaultAxes(face: FontFaceMeta | undefined): Record<string, number> {
  if (!face) return {};
  const axes: Record<string, number> = {};
  for (const axis of face.axes) {
    axes[axis.tag] = axis.default;
  }
  return axes;
}

export function TypographyPanel({ texts }: { texts: TextObject[] }) {
  const updateObject = useDocumentStore((s) => s.updateObject);
  const { families } = useFonts();

  const familyId = useMemo(
    () => sharedValue(texts, (t) => t.fontFamilyId),
    [texts],
  );
  const faceId = useMemo(() => sharedValue(texts, (t) => t.fontFaceId), [texts]);
  const fontSize = useMemo(() => sharedValue(texts, (t) => t.fontSize), [texts]);
  const letterSpacing = useMemo(
    () => sharedValue(texts, (t) => t.letterSpacing),
    [texts],
  );

  const family = findFamily(families, String(familyId.value ?? ''));
  const face =
    findFace(family, String(faceId.value ?? '')) ??
    family?.faces.find((f) => f.isVariable) ??
    family?.faces[0];
  const isVariable = Boolean(family?.isVariable || face?.isVariable);
  const axes = face?.axes ?? [];
  const featureTags = face?.features ?? [];

  const patchTexts = (patch: Partial<TextObject>) => {
    for (const obj of texts) {
      updateObject(obj.id, patch);
    }
  };

  const onFamilyChange = (nextFamilyId: string) => {
    const nextFamily = findFamily(families, nextFamilyId);
    const nextFace = nextFamily?.faces[0];
    patchTexts({
      fontFamilyId: nextFamilyId,
      fontFaceId: nextFace?.id ?? '',
      fontWeight: nextFace?.weight ?? 400,
      variableAxes: defaultAxes(nextFace),
      features: {},
    });
  };

  const onFaceChange = (nextFaceId: string) => {
    const nextFace = findFace(family, nextFaceId);
    if (!nextFace) return;
    patchTexts({
      fontFaceId: nextFace.id,
      fontWeight: nextFace.weight,
      variableAxes: defaultAxes(nextFace),
      features: {},
    });
  };

  const axisValue = (tag: string): { value: number; mixed: boolean } => {
    const result = sharedValue(texts, (t) => t.variableAxes[tag]);
    const fallback = axes.find((a) => a.tag === tag)?.default ?? 400;
    return {
      value: typeof result.value === 'number' ? result.value : fallback,
      mixed: result.mixed,
    };
  };

  const featureValue = (tag: string): { value: boolean; mixed: boolean } => {
    const result = sharedValue(texts, (t) => Boolean(t.features[tag]));
    return {
      value: Boolean(result.value),
      mixed: result.mixed,
    };
  };

  return (
    <div className="panel-group panel-typography">
      <div className="panel-group-header">Typography</div>
      <div className="panel-group-content">
        <div className="panel-row">
          <div className="col-12">
            <div className="input-control input-size-s input-field">
              <div className="label">
                <div className="text">Font</div>
              </div>
              <div className="input-wrapper">
                <select
                  className="input"
                  id="typography-font-family"
                  value={familyId.mixed ? '' : String(familyId.value ?? '')}
                  onChange={(e) => onFamilyChange(e.target.value)}
                >
                  {familyId.mixed ? (
                    <option value="" disabled>
                      mix
                    </option>
                  ) : null}
                  {!familyId.value && !familyId.mixed ? (
                    <option value="">انتخاب فونت</option>
                  ) : null}
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-row">
          <div className="col-6">
            {isVariable ? (
              (() => {
                const wght = axes.find((a) => a.tag === 'wght');
                const current = axisValue('wght');
                return (
                  <NumberInput
                    controlClassName="input-control-font-weight"
                    label="Weight"
                    id="typography-weight"
                    value={current.mixed ? '' : Math.round(current.value)}
                    placeholder={current.mixed ? 'mix' : undefined}
                    onChange={(w) => {
                      const min = wght?.min ?? 1;
                      const max = wght?.max ?? 1000;
                      const clamped = Math.min(max, Math.max(min, w));
                      patchTexts({
                        fontWeight: clamped,
                        variableAxes: { wght: clamped },
                      });
                    }}
                    step={1}
                    min={wght?.min ?? 1}
                    max={wght?.max ?? 1000}
                  />
                );
              })()
            ) : (
              <div className="input-control input-size-s input-field">
                <div className="label">
                  <div className="text">Weight</div>
                </div>
                <div className="input-wrapper">
                  <select
                    className="input"
                    id="typography-face"
                    value={faceId.mixed ? '' : String(faceId.value ?? '')}
                    onChange={(e) => onFaceChange(e.target.value)}
                    disabled={!family}
                  >
                    {faceId.mixed ? (
                      <option value="" disabled>
                        mix
                      </option>
                    ) : null}
                    {(family?.faces ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.weight}
                        {f.style !== 'normal' ? ` / ${f.style}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="col-3">
            <NumberInput
              controlClassName="input-control-font-size"
              label="Size"
              suffix="px"
              id="typography-font-size"
              value={fontSize.mixed ? '' : Number(fontSize.value ?? 48)}
              placeholder={fontSize.mixed ? 'mix' : undefined}
              onChange={(v) => patchTexts({ fontSize: Math.max(1, v) })}
              step={1}
              min={1}
            />
          </div>
          <div className="col-3">
            <NumberInput
              controlClassName="input-control-letter-spacing"
              label="Spacing"
              suffix="px"
              id="typography-letter-spacing"
              value={letterSpacing.mixed ? '' : Number(letterSpacing.value ?? 0)}
              placeholder={letterSpacing.mixed ? 'mix' : undefined}
              onChange={(v) => patchTexts({ letterSpacing: v })}
              step={0.1}
            />
          </div>
        </div>

        {axes.length > 0 ? (
          <div className="typography-axes">
            {axes.map((axis) => {
              const current = axisValue(axis.tag);
              const step = Math.max((axis.max - axis.min) / 100, 0.01);
              return (
                <div className="typography-axis-row" key={axis.tag}>
                  <div className="typography-axis-header">
                    <span className="typography-axis-label">{axisLabel(axis)}</span>
                    <span className="typography-axis-value">
                      {current.mixed ? 'mix' : Math.round(current.value * 100) / 100}
                    </span>
                  </div>
                  <Slider.Root
                    className="typography-slider"
                    min={axis.min}
                    max={axis.max}
                    step={step}
                    value={[current.value]}
                    onValueChange={([v]) => {
                      if (v == null) return;
                      patchTexts({
                        variableAxes: { [axis.tag]: v },
                        ...(axis.tag === 'wght' ? { fontWeight: v } : {}),
                      });
                    }}
                  >
                    <Slider.Track className="typography-slider-track">
                      <Slider.Range className="typography-slider-range" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="typography-slider-thumb"
                      aria-label={axisLabel(axis)}
                    />
                  </Slider.Root>
                </div>
              );
            })}
          </div>
        ) : null}

        {featureTags.length > 0 ? (
          <div className="typography-features">
            {featureTags.map((tag) => {
              const current = featureValue(tag);
              return (
                <label className="typography-feature-row" key={tag}>
                  <span className="typography-feature-label">
                    {featureLabel(tag)}
                    <span className="typography-feature-tag">{tag}</span>
                  </span>
                  <Switch.Root
                    className="typography-switch"
                    checked={current.mixed ? false : current.value}
                    onCheckedChange={(checked) =>
                      patchTexts({ features: { [tag]: checked } })
                    }
                    aria-label={featureLabel(tag)}
                  >
                    <Switch.Thumb className="typography-switch-thumb" />
                  </Switch.Root>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
