import hbjs, { type HbJs } from 'harfbuzzjs/hbjs.js';
import createHarfBuzz from 'harfbuzzjs/hb.js';
import wasmUrl from 'harfbuzzjs/hb.wasm?url';

let hbPromise: Promise<HbJs> | null = null;

/**
 * Load harfbuzzjs WASM once and wrap it with hbjs.
 * Import that worked: `harfbuzzjs/hbjs.js` + `harfbuzzjs/hb.js` with
 * `harfbuzzjs/hb.wasm?url` passed via `locateFile`.
 */
export function getHarfBuzz(): Promise<HbJs> {
  if (!hbPromise) {
    hbPromise = createHarfBuzz({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) return wasmUrl;
        return file;
      },
    }).then((module) => hbjs(module));
  }
  return hbPromise;
}

export type { HbJs };
