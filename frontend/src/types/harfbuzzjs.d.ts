declare module 'harfbuzzjs/hbjs.js' {
  export interface HbGlyphInfo {
    g: number;
    cl: number;
    ax: number;
    ay: number;
    dx: number;
    dy: number;
    flags: number;
  }

  export interface HbBlob {
    ptr: number;
    destroy(): void;
  }

  export interface HbFace {
    ptr: number;
    upem: number;
    destroy(): void;
    collectUnicodes(): Uint32Array;
    getAxisInfos(): Record<string, { min: number; default: number; max: number }>;
  }

  export interface HbPathCommand {
    type: string;
    values: number[];
  }

  export interface HbFont {
    ptr: number;
    glyphName(glyphId: number): string;
    glyphToPath(glyphId: number): string;
    glyphToJson(glyphId: number): HbPathCommand[];
    setScale(xScale: number, yScale: number): void;
    setVariations(variations: Record<string, number>): void;
    destroy(): void;
  }

  export interface HbBuffer {
    ptr: number;
    addText(text: string): void;
    guessSegmentProperties(): void;
    setDirection(dir: 'ltr' | 'rtl' | 'ttb' | 'btt'): void;
    setLanguage(language: string): void;
    setScript(script: string): void;
    setFlags(flags: string[]): void;
    setClusterLevel(level: number): void;
    json(font?: HbFont): HbGlyphInfo[];
    destroy(): void;
  }

  export interface HbJs {
    createBlob(data: ArrayBuffer | Uint8Array): HbBlob;
    createFace(blob: HbBlob, index: number): HbFace;
    createFont(face: HbFace): HbFont;
    createBuffer(): HbBuffer;
    shape(font: HbFont, buffer: HbBuffer, features?: string): void;
    shapeWithTrace(
      font: HbFont,
      buffer: HbBuffer,
      features: string | undefined,
      stop_at: number,
      stop_phase: number,
    ): unknown[];
    version(): { major: number; minor: number; micro: number };
    version_string(): string;
  }

  export default function hbjs(Module: unknown): HbJs;
}

declare module 'harfbuzzjs/hb.js' {
  type HbModule = Record<string, unknown>;
  export default function createHarfBuzz(moduleArg?: {
    locateFile?: (path: string, scriptDirectory?: string) => string;
    wasmBinary?: ArrayBuffer;
    [key: string]: unknown;
  }): Promise<HbModule>;
}

declare module 'harfbuzzjs/hb.wasm' {
  const url: string;
  export default url;
}

declare module 'harfbuzzjs/hb.wasm?url' {
  const url: string;
  export default url;
}

declare module 'harfbuzzjs' {
  import type { HbJs } from 'harfbuzzjs/hbjs.js';
  const ready: Promise<HbJs>;
  export default ready;
}
