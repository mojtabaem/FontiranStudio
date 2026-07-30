import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  type Appearance,
  type CanvasObject,
  type DocumentModel,
  type ShapeObject,
  type Subpath,
  type TextObject,
  MAX_LAYERS,
} from './types';

const HISTORY_LIMIT = 5;
const LOCAL_DESIGN_KEY = 'fs_design';

export const DEFAULT_APPEARANCE: Appearance = {
  fill: '#000000',
  stroke: 'transparent',
  strokeWidth: 0,
  opacity: 1,
};

type HistorySnapshot = {
  objects: Record<string, CanvasObject>;
  order: string[];
};

type ClipboardPayload = {
  objects: CanvasObject[];
};

export interface DocumentState {
  version: 1;
  objects: Record<string, CanvasObject>;
  order: string[];
  updatedAt: number | null;
  selectedIds: string[];
  clipboard: ClipboardPayload | null;
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  aspectRatioLocked: boolean;

  getDocument: () => DocumentModel;
  loadDocument: (doc: DocumentModel, opts?: { pushHistory?: boolean }) => void;
  resetDocument: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  select: (ids: string[], opts?: { additive?: boolean }) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  setAspectRatioLocked: (locked: boolean) => void;

  addText: (partial?: Partial<TextObject>) => string | null;
  addShape: (partial?: Partial<ShapeObject>) => string | null;
  updateObject: (id: string, patch: Partial<CanvasObject>, opts?: { history?: boolean }) => void;
  deleteObjects: (ids: string[]) => void;
  rename: (id: string, name: string) => void;
  setVisibility: (id: string, visible: boolean) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  moveObjectOrder: (id: string, toIndex: number) => void;

  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  duplicateSelection: () => void;

  /** Replace a text object with a shape (same id). Pass result of convertTextObjectToShape. */
  convertTextToShape: (id: string, shape: ShapeObject) => void;
  replaceObject: (id: string, obj: CanvasObject, opts?: { history?: boolean }) => void;

  persistLocal: () => void;
  restoreLocal: () => DocumentModel | null;
}

function emptyDoc(): Pick<DocumentState, 'version' | 'objects' | 'order' | 'updatedAt'> {
  return {
    version: 1,
    objects: {},
    order: [],
    updatedAt: null,
  };
}

function snapshotOf(state: DocumentState): HistorySnapshot {
  return {
    objects: structuredClone(state.objects),
    order: [...state.order],
  };
}

function defaultText(partial?: Partial<TextObject>): TextObject {
  const id = partial?.id ?? nanoid(8);
  return {
    id,
    type: 'text',
    name: partial?.name ?? 'متن',
    x: partial?.x ?? 200,
    y: partial?.y ?? 200,
    width: partial?.width ?? 240,
    height: partial?.height ?? 80,
    rotation: partial?.rotation ?? 0,
    scaleX: partial?.scaleX ?? 1,
    scaleY: partial?.scaleY ?? 1,
    visible: partial?.visible ?? true,
    appearance: { ...DEFAULT_APPEARANCE, ...partial?.appearance },
    text: partial?.text ?? 'متن نمونه',
    fontFamilyId: partial?.fontFamilyId ?? '',
    fontFaceId: partial?.fontFaceId ?? '',
    fontSize: partial?.fontSize ?? 48,
    letterSpacing: partial?.letterSpacing ?? 0,
    fontWeight: partial?.fontWeight ?? 400,
    variableAxes: { ...(partial?.variableAxes ?? {}) },
    features: { ...(partial?.features ?? {}) },
  };
}

function defaultShape(partial?: Partial<ShapeObject>): ShapeObject {
  const id = partial?.id ?? nanoid(8);
  const subpaths: Subpath[] = partial?.subpaths ?? [
    {
      closed: true,
      points: [
        { anchor: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
        { anchor: { x: 120, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
        { anchor: { x: 120, y: 80 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
        { anchor: { x: 0, y: 80 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
      ],
    },
  ];
  return {
    id,
    type: 'shape',
    name: partial?.name ?? 'شکل',
    x: partial?.x ?? 200,
    y: partial?.y ?? 200,
    width: partial?.width ?? 120,
    height: partial?.height ?? 80,
    rotation: partial?.rotation ?? 0,
    scaleX: partial?.scaleX ?? 1,
    scaleY: partial?.scaleY ?? 1,
    visible: partial?.visible ?? true,
    appearance: {
      fill: '#E8E8E8',
      stroke: '#888888',
      strokeWidth: 1,
      opacity: 1,
      ...partial?.appearance,
    },
    subpaths,
  };
}

function canAddLayer(order: string[]): boolean {
  return order.length < MAX_LAYERS;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...emptyDoc(),
  selectedIds: [],
  clipboard: null,
  past: [],
  future: [],
  aspectRatioLocked: true,

  getDocument: () => {
    const { version, objects, order, updatedAt } = get();
    return { version, objects, order, updatedAt };
  },

  loadDocument: (doc, opts) => {
    set((state) => {
      const next: Partial<DocumentState> = {
        version: 1,
        objects: structuredClone(doc.objects),
        order: [...doc.order],
        updatedAt: doc.updatedAt,
        selectedIds: [],
        future: [],
      };
      if (opts?.pushHistory) {
        next.past = [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT);
      } else {
        next.past = [];
      }
      return next;
    });
  },

  resetDocument: () => {
    set({
      ...emptyDoc(),
      selectedIds: [],
      past: [],
      future: [],
    });
  },

  pushHistory: () => {
    set((state) => ({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1]!;
    set((state) => ({
      past: past.slice(0, -1),
      future: [snapshotOf(state), ...future].slice(0, HISTORY_LIMIT),
      objects: structuredClone(previous.objects),
      order: [...previous.order],
      updatedAt: Date.now(),
      selectedIds: state.selectedIds.filter((id) => id in previous.objects),
    }));
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const next = future[0]!;
    set((state) => ({
      past: [...past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      objects: structuredClone(next.objects),
      order: [...next.order],
      updatedAt: Date.now(),
      selectedIds: state.selectedIds.filter((id) => id in next.objects),
    }));
  },

  select: (ids, opts) => {
    set((state) => {
      if (opts?.additive) {
        const merged = new Set(state.selectedIds);
        for (const id of ids) merged.add(id);
        return { selectedIds: [...merged] };
      }
      return { selectedIds: [...ids] };
    });
  },

  toggleSelect: (id) => {
    set((state) => {
      if (state.selectedIds.includes(id)) {
        return { selectedIds: state.selectedIds.filter((x) => x !== id) };
      }
      return { selectedIds: [...state.selectedIds, id] };
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  setAspectRatioLocked: (locked) => set({ aspectRatioLocked: locked }),

  addText: (partial) => {
    const state = get();
    if (!canAddLayer(state.order)) return null;
    const obj = defaultText(partial);
    state.pushHistory();
    set((s) => ({
      objects: { ...s.objects, [obj.id]: obj },
      order: [...s.order, obj.id],
      selectedIds: [obj.id],
      updatedAt: Date.now(),
    }));
    return obj.id;
  },

  addShape: (partial) => {
    const state = get();
    if (!canAddLayer(state.order)) return null;
    const obj = defaultShape(partial);
    state.pushHistory();
    set((s) => ({
      objects: { ...s.objects, [obj.id]: obj },
      order: [...s.order, obj.id],
      selectedIds: [obj.id],
      updatedAt: Date.now(),
    }));
    return obj.id;
  },

  updateObject: (id, patch, opts) => {
    const state = get();
    const current = state.objects[id];
    if (!current) return;
    if (opts?.history !== false) state.pushHistory();
    set((s) => {
      const prev = s.objects[id];
      if (!prev) return s;
      const next = { ...prev, ...patch, id: prev.id, type: prev.type } as CanvasObject;
      if (patch.appearance) {
        next.appearance = { ...prev.appearance, ...patch.appearance };
      }
      if (prev.type === 'text' && next.type === 'text') {
        if (patch.type === 'text' || !('type' in patch)) {
          const textPatch = patch as Partial<TextObject>;
          if (textPatch.variableAxes) {
            next.variableAxes = { ...prev.variableAxes, ...textPatch.variableAxes };
          }
          if (textPatch.features) {
            next.features = { ...prev.features, ...textPatch.features };
          }
        }
      }
      return {
        objects: { ...s.objects, [id]: next },
        updatedAt: Date.now(),
      };
    });
  },

  deleteObjects: (ids) => {
    if (ids.length === 0) return;
    get().pushHistory();
    set((s) => {
      const objects = { ...s.objects };
      for (const id of ids) delete objects[id];
      return {
        objects,
        order: s.order.filter((id) => !ids.includes(id)),
        selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
        updatedAt: Date.now(),
      };
    });
  },

  rename: (id, name) => {
    get().updateObject(id, { name } as Partial<CanvasObject>);
  },

  setVisibility: (id, visible) => {
    get().updateObject(id, { visible } as Partial<CanvasObject>);
  },

  reorder: (fromIndex, toIndex) => {
    const { order } = get();
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= order.length ||
      toIndex >= order.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    get().pushHistory();
    set((s) => {
      const next = [...s.order];
      const [item] = next.splice(fromIndex, 1);
      if (!item) return s;
      next.splice(toIndex, 0, item);
      return { order: next, updatedAt: Date.now() };
    });
  },

  moveObjectOrder: (id, toIndex) => {
    const fromIndex = get().order.indexOf(id);
    if (fromIndex === -1) return;
    get().reorder(fromIndex, toIndex);
  },

  copySelection: () => {
    const { selectedIds, objects } = get();
    const objs = selectedIds
      .map((id) => objects[id])
      .filter((o): o is CanvasObject => Boolean(o))
      .map((o) => structuredClone(o));
    if (objs.length === 0) return;
    set({ clipboard: { objects: objs } });
  },

  cutSelection: () => {
    get().copySelection();
    get().deleteObjects(get().selectedIds);
  },

  pasteClipboard: () => {
    const { clipboard, order } = get();
    if (!clipboard || clipboard.objects.length === 0) return;
    const remaining = MAX_LAYERS - order.length;
    if (remaining <= 0) return;
    const toPaste = clipboard.objects.slice(0, remaining);
    get().pushHistory();
    set((s) => {
      const objects = { ...s.objects };
      const newIds: string[] = [];
      for (const src of toPaste) {
        const id = nanoid(8);
        objects[id] = {
          ...structuredClone(src),
          id,
          name: `${src.name} کپی`,
          x: src.x + 24,
          y: src.y + 24,
        };
        newIds.push(id);
      }
      return {
        objects,
        order: [...s.order, ...newIds],
        selectedIds: newIds,
        updatedAt: Date.now(),
      };
    });
  },

  duplicateSelection: () => {
    get().copySelection();
    get().pasteClipboard();
  },

  convertTextToShape: (id, shape) => {
    const obj = get().objects[id];
    if (!obj || obj.type !== 'text') return;
    get().pushHistory();
    set((s) => ({
      objects: { ...s.objects, [id]: { ...shape, id } },
      selectedIds: [id],
      updatedAt: Date.now(),
    }));
  },

  replaceObject: (id, obj, opts) => {
    const current = get().objects[id];
    if (!current) return;
    if (opts?.history !== false) get().pushHistory();
    set((s) => ({
      objects: { ...s.objects, [id]: { ...obj, id } },
      updatedAt: Date.now(),
    }));
  },

  persistLocal: () => {
    try {
      const doc = get().getDocument();
      localStorage.setItem(LOCAL_DESIGN_KEY, JSON.stringify(doc));
    } catch {
      // ignore
    }
  },

  restoreLocal: () => {
    try {
      const raw = localStorage.getItem(LOCAL_DESIGN_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as DocumentModel;
    } catch {
      return null;
    }
  },
}));

export { LOCAL_DESIGN_KEY };
