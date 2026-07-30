import opentype from 'opentype.js';
import type { ShapeObject, Subpath, TextObject } from '@/document/types';
import { getHarfBuzz } from './harfbuzz';
import {
  getSubpathsBounds,
  svgPathToSubpaths,
  translateSubpaths,
} from './pathUtils';

export interface TextToPathOptions {
  fontBuffer: ArrayBuffer;
  text: string;
  fontSize: number;
  features?: Record<string, boolean>;
  axes?: Record<string, number>;
  letterSpacing?: number;
}

export interface TextToPathResult {
  subpaths: Subpath[];
  width: number;
  height: number;
}

function featuresToHbString(features?: Record<string, boolean>): string | undefined {
  if (!features) return undefined;
  const tags = Object.entries(features)
    .filter(([, on]) => on)
    .map(([tag]) => tag);
  return tags.length ? tags.join(',') : undefined;
}

function normalizeResult(subpaths: Subpath[]): TextToPathResult {
  const bounds = getSubpathsBounds(subpaths);
  const normalized =
    bounds.minX !== 0 || bounds.minY !== 0
      ? translateSubpaths(subpaths, -bounds.minX, -bounds.minY)
      : subpaths;
  return {
    subpaths: normalized,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
  };
}

async function textToPathHarfbuzz(options: TextToPathOptions): Promise<TextToPathResult> {
  const hb = await getHarfBuzz();
  const { fontBuffer, text, fontSize, features, axes, letterSpacing = 0 } = options;

  const blob = hb.createBlob(fontBuffer);
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);

  try {
    const upem = face.upem || 1000;
    // Map font units so upem → fontSize pixels
    font.setScale(Math.round(fontSize), Math.round(fontSize));

    if (axes && Object.keys(axes).length > 0) {
      font.setVariations(axes);
    }

    const buffer = hb.createBuffer();
    buffer.addText(text || ' ');
    buffer.guessSegmentProperties();
    hb.shape(font, buffer, featuresToHbString(features));
    const glyphs = buffer.json();
    buffer.destroy();

    const all: Subpath[] = [];
    let xCursor = 0;
    // Scale letterSpacing: stored as px at current fontSize; HB advances are already in px
    const spacing = letterSpacing;

    for (const g of glyphs) {
      const path = font.glyphToPath(g.g);
      if (path) {
        // Glyph path is in scaled font space (Y-up). Positions: dx/dy also scaled.
        // Flip Y for canvas; place at cursor + displacement.
        const ox = xCursor + g.dx;
        // With flipY, glyph y becomes -y; dy in font space also flips.
        const oy = -(g.dy);
        const pieces = svgPathToSubpaths(path, { ox, oy, flipY: true });
        all.push(...pieces);
      }
      xCursor += g.ax + spacing;
    }

    // HB uses upem-relative scale; verify path coords aren't still in upem.
    // setScale(fontSize, fontSize) means 1 upem unit drawn at fontSize/upem px —
    // glyphToPath output is already in that pixel space.
    void upem;

    return normalizeResult(all);
  } finally {
    font.destroy();
    face.destroy();
    blob.destroy();
  }
}

/**
 * Fallback via opentype.js (limited Arabic/Persian shaping — no full GSUB/GPOS).
 * For RTL scripts, characters are shaped LTR per-glyph with a simple RTL advance.
 */
function textToPathOpentype(options: TextToPathOptions): TextToPathResult {
  const { fontBuffer, text, fontSize, axes, letterSpacing = 0 } = options;
  const font = opentype.parse(fontBuffer.slice(0));

  // Best-effort variable axes
  if (axes && Object.keys(axes).length > 0 && typeof (font as unknown as { variation?: { set?: (a: Record<string, number>) => void } }).variation?.set === 'function') {
    try {
      (font as unknown as { variation: { set: (a: Record<string, number>) => void } }).variation.set(axes);
    } catch {
      // ignore
    }
  }

  const hasRtl = /[\u0590-\u08FF\uFB1D-\uFEFC]/.test(text);
  const chars = [...(text || ' ')];
  if (hasRtl) chars.reverse();

  const all: Subpath[] = [];
  let x = 0;
  for (const ch of chars) {
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(0, 0, fontSize);
    const d = path.toPathData(2);
    const pieces = svgPathToSubpaths(d, { ox: x, oy: 0, flipY: false });
    // opentype.js getPath already uses canvas Y-down
    all.push(...pieces);
    const adv = ((glyph.advanceWidth ?? font.unitsPerEm) / font.unitsPerEm) * fontSize;
    x += adv + letterSpacing;
  }

  return normalizeResult(all);
}

export async function textToPath(options: TextToPathOptions): Promise<TextToPathResult> {
  if (!options.text) {
    return { subpaths: [], width: 1, height: 1 };
  }
  try {
    return await textToPathHarfbuzz(options);
  } catch (err) {
    console.warn('[textToPath] harfbuzz failed, falling back to opentype.js', err);
    return textToPathOpentype(options);
  }
}

/** Build a ShapeObject from a TextObject using glyph outlines. Keeps the same id. */
export async function convertTextObjectToShape(
  textObj: TextObject,
  fontBuffer: ArrayBuffer,
): Promise<ShapeObject> {
  const result = await textToPath({
    fontBuffer,
    text: textObj.text,
    fontSize: textObj.fontSize,
    features: textObj.features,
    axes: textObj.variableAxes,
    letterSpacing: textObj.letterSpacing,
  });

  return {
    id: textObj.id,
    type: 'shape',
    name: textObj.name,
    x: textObj.x,
    y: textObj.y,
    width: result.width || textObj.width,
    height: result.height || textObj.height,
    rotation: textObj.rotation,
    scaleX: textObj.scaleX,
    scaleY: textObj.scaleY,
    visible: textObj.visible,
    appearance: { ...textObj.appearance },
    subpaths:
      result.subpaths.length > 0
        ? result.subpaths
        : [
            {
              closed: true,
              points: [
                { anchor: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
                {
                  anchor: { x: result.width || 40, y: 0 },
                  handleIn: { x: 0, y: 0 },
                  handleOut: { x: 0, y: 0 },
                },
                {
                  anchor: { x: result.width || 40, y: result.height || 40 },
                  handleIn: { x: 0, y: 0 },
                  handleOut: { x: 0, y: 0 },
                },
                {
                  anchor: { x: 0, y: result.height || 40 },
                  handleIn: { x: 0, y: 0 },
                  handleOut: { x: 0, y: 0 },
                },
              ],
            },
          ],
  };
}
