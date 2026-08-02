import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  titleIcon?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  showClose?: boolean;
  hideTitle?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  titleIcon = 'user',
  children,
  footer,
  className,
  showClose = true,
  hideTitle = false,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay" />
        {/*
          Native <dialog> uses class "dialog" as a full-viewport shell.
          Radix Content is only the panel — never add "dialog" here or it becomes height:100%.
        */}
        <RadixDialog.Content
          className={['dialog-panel', className].filter(Boolean).join(' ')}
          aria-describedby={undefined}
        >
          <div className="dialog-content">
            <div className="dialog-header">
              {showClose ? (
                <RadixDialog.Close asChild>
                  <button
                    className="dialog-btn dialog-btn-close"
                    type="button"
                    aria-label="بستن"
                  >
                    <Icon name="x" />
                  </button>
                </RadixDialog.Close>
              ) : null}
              <div
                className="dialog-header-title"
                style={hideTitle ? { display: 'none' } : undefined}
              >
                {title ? (
                  <RadixDialog.Title className="dialog-header-title-text">
                    {title}
                  </RadixDialog.Title>
                ) : (
                  <RadixDialog.Title className="sr-only">Dialog</RadixDialog.Title>
                )}
                {titleIcon ? (
                  <div className="dialog-header-title-icon">
                    <Icon name={titleIcon} />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="dialog-body">{children}</div>
            {footer ? <div className="dialog-footer">{footer}</div> : null}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
