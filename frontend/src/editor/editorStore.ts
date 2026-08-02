import { create } from 'zustand';
import { type Tool, MAX_ZOOM, MIN_ZOOM } from '@/document/types';
import { clampPan } from '@/canvas/coords';

export type ExportTarget = 'design' | string;
export type DialogName = 'login' | 'profile' | 'export';

export interface EditorState {
  tool: Tool;
  zoom: number;
  panX: number;
  panY: number;
  viewportWidth: number;
  viewportHeight: number;
  isSpacePanning: boolean;
  editingTextId: string | null;
  pathEditObjectId: string | null;
  selectedPathPoint: { subpathIndex: number; pointIndex: number } | null;
  toast: string | null;
  dialogs: Record<DialogName, boolean>;
  exportTarget: ExportTarget;
  aspectRatioLocked: boolean;

  setTool: (tool: Tool) => void;
  setViewportSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  zoomBy: (delta: number) => void;
  setPan: (panX: number, panY: number) => void;
  panBy: (dx: number, dy: number) => void;
  setCamera: (partial: { zoom?: number; panX?: number; panY?: number }) => void;
  setSpacePanning: (active: boolean) => void;
  setEditingTextId: (id: string | null) => void;
  setPathEditObjectId: (id: string | null) => void;
  setSelectedPathPoint: (
    point: { subpathIndex: number; pointIndex: number } | null,
  ) => void;
  showToast: (message: string, durationMs?: number) => void;
  clearToast: () => void;
  openDialog: (name: DialogName) => void;
  closeDialog: (name: DialogName) => void;
  setDialog: (name: DialogName, open: boolean) => void;
  setExportTarget: (target: ExportTarget) => void;
  setAspectRatioLocked: (locked: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function withClampedCamera(
  state: Pick<
    EditorState,
    'zoom' | 'panX' | 'panY' | 'viewportWidth' | 'viewportHeight'
  >,
  next: Partial<Pick<EditorState, 'zoom' | 'panX' | 'panY'>>,
) {
  const zoom = clampZoom(next.zoom ?? state.zoom);
  const panX = next.panX ?? state.panX;
  const panY = next.panY ?? state.panY;
  const vw = state.viewportWidth || 1;
  const vh = state.viewportHeight || 1;
  const clamped = clampPan(panX, panY, zoom, vw, vh);
  return { zoom, panX: clamped.panX, panY: clamped.panY };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tool: 'move',
  zoom: 1,
  panX: 0,
  panY: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  isSpacePanning: false,
  editingTextId: null,
  pathEditObjectId: null,
  selectedPathPoint: null,
  toast: null,
  dialogs: {
    login: false,
    profile: false,
    export: false,
  },
  exportTarget: 'design',
  aspectRatioLocked: true,

  setTool: (tool) => set({ tool }),

  setViewportSize: (width, height) => {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    set((s) => {
      if (s.viewportWidth === w && s.viewportHeight === h) return s;
      return {
        viewportWidth: w,
        viewportHeight: h,
        ...withClampedCamera(
          { ...s, viewportWidth: w, viewportHeight: h },
          {},
        ),
      };
    });
  },

  setZoom: (zoom) =>
    set((s) => withClampedCamera(s, { zoom })),

  zoomBy: (delta) =>
    set((s) => withClampedCamera(s, { zoom: s.zoom + delta })),

  setPan: (panX, panY) =>
    set((s) => withClampedCamera(s, { panX, panY })),

  panBy: (dx, dy) =>
    set((s) => withClampedCamera(s, { panX: s.panX + dx, panY: s.panY + dy })),

  setCamera: (partial) =>
    set((s) => withClampedCamera(s, partial)),

  setSpacePanning: (active) => {
    set({ isSpacePanning: active });
  },

  setEditingTextId: (id) => set({ editingTextId: id }),

  setPathEditObjectId: (id) => set({ pathEditObjectId: id }),

  setSelectedPathPoint: (point) => set({ selectedPathPoint: point }),

  showToast: (message, durationMs = 2800) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => {
      if (get().toast === message) set({ toast: null });
      toastTimer = null;
    }, durationMs);
  },

  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set({ toast: null });
  },

  openDialog: (name) =>
    set((s) => ({ dialogs: { ...s.dialogs, [name]: true } })),

  closeDialog: (name) =>
    set((s) => ({ dialogs: { ...s.dialogs, [name]: false } })),

  setDialog: (name, open) =>
    set((s) => ({ dialogs: { ...s.dialogs, [name]: open } })),

  setExportTarget: (target) => set({ exportTarget: target }),

  setAspectRatioLocked: (locked) => set({ aspectRatioLocked: locked }),
}));
