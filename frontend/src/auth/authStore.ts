import { create } from 'zustand';
import { api, getStoredToken, setStoredToken } from '@/api/client';
import {
  loadFontFaceFromBuffer,
  setFamilyCssName,
  unloadAllFonts,
} from '@/fonts/fontManager';
import { setFontBuffer } from '@/fonts/fontBufferCache';

export interface AuthUser {
  id: string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
}

export type FontAxis = {
  tag: string;
  min: number;
  max: number;
  default: number;
  name?: string;
};

export type FontFaceMeta = {
  id: string;
  fileName: string;
  weight: number;
  style: string;
  isVariable: boolean;
  axes: FontAxis[];
  features: string[];
  url: string;
};

export type FontFamilyMeta = {
  id: string;
  fontiranId?: string;
  name: string;
  isVariable: boolean;
  faces: FontFaceMeta[];
};

/** Empty catalog when GET /api/fonts fails in development. */
export const DEV_FALLBACK: FontFamilyMeta[] = [];

interface AuthMeResponse {
  id: string;
  phone?: string | null;
  email?: string | null;
  fonts?: unknown;
  user?: AuthUser;
}

interface LoginResponse {
  token: string;
  user: AuthUser & { fonts?: unknown };
}

interface ApiFontFace {
  id: string;
  fileName: string;
  weight?: number;
  style?: string;
  isVariable?: boolean;
  axes?: FontAxis[];
  features?: string[];
  url?: string;
}

interface ApiFontFamily {
  id: string;
  familyId?: string;
  fontiranId?: string;
  name: string;
  isVariable?: boolean;
  faces?: ApiFontFace[];
}

function normalizeFamily(raw: ApiFontFamily): FontFamilyMeta {
  const id = raw.id || raw.familyId || '';
  return {
    id,
    fontiranId: raw.fontiranId,
    name: raw.name,
    isVariable: Boolean(raw.isVariable),
    faces: (raw.faces ?? []).map((face) => ({
      id: face.id,
      fileName: face.fileName,
      weight: face.weight ?? 400,
      style: face.style ?? 'normal',
      isVariable: Boolean(face.isVariable),
      axes: face.axes ?? [],
      features: face.features ?? [],
      url: face.url ?? `/api/fonts/files/${face.id}`,
    })),
  };
}

async function fetchFaceBuffer(url: string, token: string): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Font fetch failed (${res.status})`);
  }
  return res.arrayBuffer();
}

async function registerFamilies(families: FontFamilyMeta[], token: string): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  for (const family of families) {
    const cssName = setFamilyCssName(family.id, `FS-${family.id}`);
    for (const face of family.faces) {
      tasks.push(
        (async () => {
          try {
            const buffer = await fetchFaceBuffer(face.url, token);
            setFontBuffer(face.id, buffer);
            await loadFontFaceFromBuffer({
              id: face.id,
              familyCssName: cssName,
              weight: face.weight,
              isVariable: face.isVariable,
              buffer,
            });
          } catch {
            // best-effort per face
          }
        })(),
      );
    }
  }
  await Promise.all(tasks);
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  fonts: FontFamilyMeta[];
  fontsLoaded: boolean;
  fontsLoading: boolean;
  loading: boolean;

  setToken: (token: string | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  me: () => Promise<boolean>;
  loadFonts: () => Promise<void>;
  ensureFontsLoaded: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: null,
  fonts: [],
  fontsLoaded: false,
  fontsLoading: false,
  loading: false,

  setToken: (token) => {
    setStoredToken(token);
    set({ token });
  },

  login: async () => {
    set({ loading: true });
    try {
      // Mock provider: POST /api/auth/login returns a session immediately.
      // TODO: real Fontiran OAuth redirect flow when FONTIRAN_PROVIDER !== mock
      const data = await api<LoginResponse>('/auth/login', { method: 'POST' });
      setStoredToken(data.token);
      set({ token: data.token, user: data.user });
      await get().loadFonts();
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // best-effort
    }
    unloadAllFonts();
    setStoredToken(null);
    set({
      token: null,
      user: null,
      fonts: [],
      fontsLoaded: false,
      fontsLoading: false,
    });
  },

  me: async () => {
    const token = get().token ?? getStoredToken();
    if (!token) {
      set({ user: null, fonts: [], fontsLoaded: false });
      return false;
    }
    set({ loading: true, token });
    try {
      const data = await api<AuthMeResponse>('/auth/me');
      const user: AuthUser = data.user ?? {
        id: data.id,
        phone: data.phone,
        email: data.email,
      };
      set({ user });
      return true;
    } catch {
      unloadAllFonts();
      setStoredToken(null);
      set({
        token: null,
        user: null,
        fonts: [],
        fontsLoaded: false,
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  loadFonts: async () => {
    const token = get().token ?? getStoredToken();
    if (!token) {
      set({ fonts: [], fontsLoaded: false });
      return;
    }
    set({ fontsLoading: true });
    try {
      const raw = await api<ApiFontFamily[]>('/fonts');
      const fonts = (raw ?? []).map(normalizeFamily);
      set({ fonts, fontsLoaded: false });
      await registerFamilies(fonts, token);
      set({ fontsLoaded: true });
    } catch {
      // In development, keep an empty catalog instead of breaking the editor.
      if (import.meta.env.DEV) {
        set({ fonts: DEV_FALLBACK, fontsLoaded: true });
      } else {
        set({ fonts: [], fontsLoaded: false });
      }
    } finally {
      set({ fontsLoading: false });
    }
  },

  ensureFontsLoaded: async () => {
    const { fonts, fontsLoaded, fontsLoading, token } = get();
    if (!token || fontsLoading) return;
    if (fonts.length > 0 && !fontsLoaded) {
      set({ fontsLoading: true });
      try {
        await registerFamilies(fonts, token);
        set({ fontsLoaded: true });
      } finally {
        set({ fontsLoading: false });
      }
      return;
    }
    if (!fontsLoaded && fonts.length === 0) {
      await get().loadFonts();
    }
  },

  restoreSession: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ token: null, user: null });
      return false;
    }
    set({ token });
    const ok = await get().me();
    if (ok) await get().loadFonts();
    return ok;
  },
}));
