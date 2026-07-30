import { getStoredToken } from '@/api/client';

const cache = new Map<string, ArrayBuffer>();
const inflight = new Map<string, Promise<ArrayBuffer>>();

function faceUrl(faceId: string, url?: string): string {
  if (url) return url;
  return `/api/fonts/files/${faceId}`;
}

/** Clone so callers can safely transfer/parse without mutating the cache. */
function cloneBuffer(buf: ArrayBuffer): ArrayBuffer {
  return buf.slice(0);
}

export function peekFontBuffer(faceId: string): ArrayBuffer | null {
  const hit = cache.get(faceId);
  return hit ? cloneBuffer(hit) : null;
}

export function setFontBuffer(faceId: string, buffer: ArrayBuffer): void {
  cache.set(faceId, buffer.slice(0));
}

export function clearFontBufferCache(): void {
  cache.clear();
  inflight.clear();
}

export async function getFontBuffer(
  faceId: string,
  url?: string,
): Promise<ArrayBuffer> {
  const cached = cache.get(faceId);
  if (cached) return cloneBuffer(cached);

  const existing = inflight.get(faceId);
  if (existing) return cloneBuffer(await existing);

  const promise = (async () => {
    const headers = new Headers();
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(faceUrl(faceId, url), { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch font (${res.status})`);
    }
    const buffer = await res.arrayBuffer();
    cache.set(faceId, buffer);
    return buffer;
  })();

  inflight.set(faceId, promise);
  try {
    return cloneBuffer(await promise);
  } finally {
    inflight.delete(faceId);
  }
}
