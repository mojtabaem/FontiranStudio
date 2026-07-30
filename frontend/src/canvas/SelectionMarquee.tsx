export interface SelectionMarqueeProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Artboard-space marquee rectangle while drag-selecting. */
export function SelectionMarquee({ x, y, width, height }: SelectionMarqueeProps) {
  if (width <= 0 && height <= 0) return null;
  return (
    <div
      className="selection-marquee"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
