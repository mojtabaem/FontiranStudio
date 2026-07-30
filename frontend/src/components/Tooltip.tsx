import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 250,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="tippy-box"
            data-theme="default-tippy"
            side={side}
            sideOffset={10}
          >
            <div className="tippy-content">{content}</div>
            <TooltipPrimitive.Arrow className="tippy-arrow" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export interface HintShortcut {
  label: string;
  keys: string[];
  orHold?: string;
}

export interface HintTooltipProps {
  items: HintShortcut[];
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/** Toolbar-style shortcut hint (hint-tippy theme). */
export function HintTooltip({ items, children, side = 'top' }: HintTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={1000}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="tippy-box"
            data-theme="hint-tippy"
            side={side}
            sideOffset={10}
          >
            <div className="tippy-content">
              <div className="hint-tippy-wrapper">
                {items.map((item) => (
                  <div className="hint-tippy-item" key={item.label}>
                    <div className="hint-tippy-label">
                      <span>{item.label}</span>
                    </div>
                    <div className="hint-tippy-shortcuts">
                      {item.keys.map((key) => (
                        <div className="hint-tippy-key" key={key}>
                          <kbd>{key}</kbd>
                        </div>
                      ))}
                      {item.orHold ? (
                        <>
                          <span className="hint-tippy-or">or hold</span>
                          <div className="hint-tippy-key">
                            <kbd>{item.orHold}</kbd>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
