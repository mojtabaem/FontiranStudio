import type { HbJs } from 'harfbuzzjs/hbjs.js';
import wasmUrl from 'harfbuzzjs/hb.wasm?url';

let hbPromise: Promise<HbJs> | null = null;

function unwrapModule<T>(mod: unknown): T {
  if (typeof mod === 'function') return mod as T;
  if (mod && typeof mod === 'object') {
    const record = mod as Record<string, unknown>;
    if (typeof record.default === 'function') return record.default as T;
  }
  return mod as T;
}

/**
 * Load harfbuzzjs WASM once and wrap it with hbjs.
 * hb.js / hbjs.js are CommonJS; Vite prebundles them via optimizeDeps.include.
 */
export function getHarfBuzz(): Promise<HbJs> {
  if (!hbPromise) {
    hbPromise = (async () => {
      const [hbMod, hbjsMod] = await Promise.all([
        import('harfbuzzjs/hb.js'),
        import('harfbuzzjs/hbjs.js'),
      ]);
      const createHarfBuzz = unwrapModule<
        (opts?: {
          locateFile?: (path: string, scriptDirectory?: string) => string;
        }) => Promise<unknown>
      >(hbMod);
      const hbjs = unwrapModule<(module: unknown) => HbJs>(hbjsMod);
      const module = await createHarfBuzz({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) return wasmUrl;
          return file;
        },
      });
      return hbjs(module);
    })().catch((err) => {
      hbPromise = null;
      throw err;
    });
  }
  return hbPromise;
}

export type { HbJs };
