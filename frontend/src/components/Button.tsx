import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary';
type Size = 'sm' | 'md' | 'lg';
type Tone = 'info' | 'danger' | 'warning' | 'success';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  tone?: Tone;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  tone = 'info',
  icon,
  children,
  className,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    'ui-btn',
    variant === 'primary' && 'ui-btn-primary',
    variant === 'tertiary' && 'ui-btn-tertiary',
    size === 'sm' && 'ui-btn-size-sm',
    size === 'lg' && 'ui-btn-size-lg',
    tone === 'danger' && 'ui-btn-danger',
    tone === 'warning' && 'ui-btn-warning',
    tone === 'success' && 'ui-btn-success',
    disabled && 'is-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} {...rest}>
      {children !== undefined && children !== null ? (
        <div className="text">{children}</div>
      ) : null}
      {icon}
    </button>
  );
}
