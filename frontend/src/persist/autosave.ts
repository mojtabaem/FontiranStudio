import { api } from '@/api/client';
import {
  useDocumentStore,
  LOCAL_DESIGN_KEY,
} from '@/document/documentStore';
import type { DocumentModel } from '@/document/types';

export type RemoteDesignPayload = {
  document: DocumentModel;
  updatedAt: string | Date | number | null;
};

function toTimestamp(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export function documentUpdatedAt(doc: DocumentModel | null | undefined): number {
  if (!doc) return 0;
  return toTimestamp(doc.updatedAt);
}

export function pickNewestDocument(
  local: DocumentModel | null,
  remote: DocumentModel | null,
  remoteMetaUpdatedAt?: unknown,
): DocumentModel | null {
  if (!local) return remote;
  if (!remote) return local;
  const localAt = documentUpdatedAt(local);
  const remoteAt = Math.max(
    documentUpdatedAt(remote),
    toTimestamp(remoteMetaUpdatedAt),
  );
  return localAt >= remoteAt ? local : remote;
}

export async function fetchRemoteDesign(): Promise<{
  document: DocumentModel;
  updatedAt: number;
} | null> {
  try {
    const data = await api<RemoteDesignPayload>('/designs/me');
    const raw = data.document ?? (data as unknown as DocumentModel);
    const updatedAt = Math.max(
      documentUpdatedAt(raw),
      toTimestamp(data.updatedAt),
    );
    const document: DocumentModel = {
      version: 1,
      objects: raw.objects ?? {},
      order: raw.order ?? [],
      updatedAt: updatedAt || null,
    };
    return { document, updatedAt };
  } catch {
    return null;
  }
}

export async function putRemoteDesign(doc: DocumentModel): Promise<void> {
  await api('/designs/me', {
    method: 'PUT',
    body: JSON.stringify({ document: doc }),
  });
}

type AutosaveHandles = {
  stop: () => void;
};

/**
 * Debounced local (1s) + remote (10s) persistence on document changes.
 * Call once from App; returns a disposer.
 */
export function startAutosave(opts: {
  getToken: () => string | null;
}): AutosaveHandles {
  let localTimer: ReturnType<typeof setTimeout> | null = null;
  let remoteTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSeenUpdatedAt: number | null | undefined = undefined;

  const unsub = useDocumentStore.subscribe((state, prev) => {
    if (state.updatedAt === prev.updatedAt) return;
    if (state.updatedAt == null) return;
    if (lastSeenUpdatedAt === state.updatedAt) return;
    lastSeenUpdatedAt = state.updatedAt;

    if (localTimer) clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      useDocumentStore.getState().persistLocal();
    }, 1000);

    if (remoteTimer) clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => {
      if (!opts.getToken()) return;
      const doc = useDocumentStore.getState().getDocument();
      void putRemoteDesign(doc).catch(() => {
        // ignore until backend is ready / offline
      });
    }, 10_000);
  });

  return {
    stop: () => {
      unsub();
      if (localTimer) clearTimeout(localTimer);
      if (remoteTimer) clearTimeout(remoteTimer);
    },
  };
}

/** Compare localStorage vs server and return the newest document. */
export async function loadNewestDesign(): Promise<DocumentModel | null> {
  let local: DocumentModel | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_DESIGN_KEY);
    if (raw) local = JSON.parse(raw) as DocumentModel;
  } catch {
    local = null;
  }

  const remote = await fetchRemoteDesign();
  return pickNewestDocument(
    local,
    remote?.document ?? null,
    remote?.updatedAt,
  );
}
