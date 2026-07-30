import type { InputHTMLAttributes } from 'react';

export interface StepperProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  /** Display multiplier, e.g. 100 for percent */
  displayScale?: number;
  suffix?: string;
}

export function Stepper({
  value,
  onChange,
  step = 0.1,
  min,
  max,
  className,
  displayScale = 1,
  suffix,
  id,
  ...rest
}: StepperProps) {
  const displayValue = Math.round(value * displayScale);
  const displayStep = step * displayScale;
  const displayMin = min !== undefined ? min * displayScale : undefined;
  const displayMax = max !== undefined ? max * displayScale : undefined;

  const clamp = (n: number) => {
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next;
  };

  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div
      className={
        className
          ? `input-control input-type-stepper ${className}`
          : 'input-control input-type-stepper'
      }
    >
      <div className="input-stepper-wrapper">
        <button
          type="button"
          className="input-stepper-btn input-stepper-btn-decrement"
          disabled={atMin}
          aria-label="کاهش"
          onClick={() => onChange(clamp(value - step))}
        >
          -
        </button>
        <input
          className="input"
          id={id}
          type="number"
          value={displayValue}
          min={displayMin}
          max={displayMax}
          step={displayStep}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (!Number.isFinite(n)) return;
            onChange(clamp(n / displayScale));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          {...rest}
        />
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
        <button
          type="button"
          className="input-stepper-btn input-stepper-btn-increment"
          disabled={atMax}
          aria-label="افزایش"
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}
