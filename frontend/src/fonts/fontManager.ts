export type LoadableFace = {
  id: string;
  url: string;
  familyCssName: string;
  weight: number;
  isVariable: boolean;
};

const loadedFaces = new Map<string, FontFace>();
const familyCssNames = new Map<string, string>();

export function getCssFamilyName(familyId: string): string {
  return familyCssNames.get(familyId) ?? `FS-${familyId}`;
}

export function setFamilyCssName(familyId: string, cssName?: string): string {
  const name = cssName?.trim() || `FS-${familyId}`;
  familyCssNames.set(familyId, name);
  return name;
}

export async function loadFontFace(face: LoadableFace): Promise<FontFace | null> {
  if (typeof document === 'undefined' || !document.fonts) return null;

  const existing = loadedFaces.get(face.id);
  if (existing) return existing;

  try {
    const descriptors: FontFaceDescriptors = {
      weight: face.isVariable ? '1 1000' : String(face.weight),
      style: 'normal',
      display: 'swap',
    };
    const fontFace = new FontFace(face.familyCssName, `url(${JSON.stringify(face.url)})`, descriptors);
    await fontFace.load();
    document.fonts.add(fontFace);
    loadedFaces.set(face.id, fontFace);
    return fontFace;
  } catch {
    return null;
  }
}

/** Fetch font binary with auth, then register via FontFace(arrayBuffer). */
export async function loadFontFaceFromBuffer(
  face: Omit<LoadableFace, 'url'> & { buffer: ArrayBuffer },
): Promise<FontFace | null> {
  if (typeof document === 'undefined' || !document.fonts) return null;

  const existing = loadedFaces.get(face.id);
  if (existing) return existing;

  try {
    const descriptors: FontFaceDescriptors = {
      weight: face.isVariable ? '1 1000' : String(face.weight),
      style: 'normal',
      display: 'swap',
    };
    const fontFace = new FontFace(face.familyCssName, face.buffer, descriptors);
    await fontFace.load();
    document.fonts.add(fontFace);
    loadedFaces.set(face.id, fontFace);
    return fontFace;
  } catch {
    return null;
  }
}

export function unloadFontFace(faceId: string): void {
  const face = loadedFaces.get(faceId);
  if (!face) return;
  try {
    document.fonts.delete(face);
  } catch {
    // ignore
  }
  loadedFaces.delete(faceId);
}

export function unloadAllFonts(): void {
  for (const faceId of [...loadedFaces.keys()]) {
    unloadFontFace(faceId);
  }
  familyCssNames.clear();
}

export function isFontFaceLoaded(faceId: string): boolean {
  return loadedFaces.has(faceId);
}

export function buildFontFeatureSettings(features: Record<string, boolean>): string {
  const parts: string[] = [];
  for (const [tag, enabled] of Object.entries(features)) {
    if (!tag) continue;
    parts.push(`"${tag}" ${enabled ? 1 : 0}`);
  }
  return parts.join(', ');
}

export function buildFontVariationSettings(axes: Record<string, number>): string {
  const parts: string[] = [];
  for (const [tag, value] of Object.entries(axes)) {
    if (!tag || !Number.isFinite(value)) continue;
    parts.push(`'${tag}' ${value}`);
  }
  return parts.join(', ');
}
