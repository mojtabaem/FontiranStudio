import { useEffect, useRef, useState } from 'react';

const cache = new Map<string, Promise<string>>();

function loadSvgMarkup(src: string): Promise<string> {
  const existing = cache.get(src);
  if (existing) return existing;

  const request = fetch(src)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load SVG: ${src}`);
      return res.text();
    })
    .catch((err) => {
      cache.delete(src);
      throw err;
    });

  cache.set(src, request);
  return request;
}

export interface IconProps {
  name: string;
  className?: string;
  /** Optional absolute path override; defaults to `/assets/icon/${name}.svg` */
  src?: string;
}

export function Icon({ name, className, src }: IconProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  const url = src ?? `/assets/icon/${name}.svg`;

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    loadSvgMarkup(url)
      .then((markup) => {
        if (cancelled || !hostRef.current) return;
        const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg || doc.querySelector('parsererror')) {
          throw new Error('Invalid SVG markup');
        }
        const node = document.importNode(svg, true);
        node.setAttribute('aria-hidden', 'true');
        hostRef.current.replaceChildren(node);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <span
      ref={hostRef}
      className={className ? `icon ${className}` : 'icon'}
      data-icon={name}
      data-failed={failed || undefined}
      aria-hidden="true"
    />
  );
}
