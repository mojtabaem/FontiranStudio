import type { InputHTMLAttributes, ReactNode } from 'react';

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'size'> {
  label?: ReactNode;
  suffix?: ReactNode;
  value: number | string;
  onChange: (value: number) => void;
  className?: string;
  controlClassName?: string;
  size?: 's' | 'm';
}

export function NumberInput({
  label,
  suffix,
  value,
  onChange,
  className,
  controlClassName,
  size = 's',
  id,
  ...rest
}: NumberInputProps) {
  const sizeClass = size === 's' ? 'input-size-s' : '';
  const controlClasses = [
    'input-control',
    sizeClass,
    'input-field',
    'input-number',
    controlClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className ? `${controlClasses} ${className}` : controlClasses}>
      {label !== undefined && label !== null && (
        <div className="label">
          {typeof label === 'string' || typeof label === 'number' ? (
            <div className="text">{label}</div>
          ) : (
            label
          )}
        </div>
      )}
      <div className="input-wrapper">
        <input
          className="input"
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange(n);
          }}
          {...rest}
        />
        {suffix !== undefined && suffix !== null && (
          <div className="input-suffix">{suffix}</div>
        )}
      </div>
    </div>
  );
}
