import { useEffect } from 'react';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import { MAX_ZOOM, MIN_ZOOM } from '@/document/types';
import { deleteSelectedPathPoints } from '@/canvas/PathEditor';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

function mod(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

/**
 * Global editor shortcuts. Skips when focus is in an input/contenteditable.
 * Space-to-pan coordinates with editorStore.isSpacePanning (Viewport reads it).
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const editor = useEditorStore.getState();
      const doc = useDocumentStore.getState();

      // Space → temporary hand
      if (e.code === 'Space') {
        if (!e.repeat) {
          e.preventDefault();
          editor.setSpacePanning(true);
        }
        return;
      }

      // Tools
      if (!mod(e) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') {
          e.preventDefault();
          editor.setPathEditObjectId(null);
          editor.setSelectedPathPoint(null);
          editor.setTool('move');
          return;
        }
        if (key === 'h') {
          e.preventDefault();
          editor.setTool('hand');
          return;
        }
        if (key === 't') {
          e.preventDefault();
          editor.setPathEditObjectId(null);
          editor.setSelectedPathPoint(null);
          editor.setTool('text');
          return;
        }
      }

      // Undo / Redo
      if (mod(e) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        doc.undo();
        return;
      }
      if (
        (mod(e) && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (mod(e) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        doc.redo();
        return;
      }

      // Clipboard
      if (mod(e) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        doc.copySelection();
        return;
      }
      if (mod(e) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        doc.cutSelection();
        return;
      }
      if (mod(e) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        doc.pasteClipboard();
        return;
      }
      if (mod(e) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        doc.duplicateSelection();
        return;
      }

      // Zoom
      if (mod(e) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        editor.setZoom(Math.min(MAX_ZOOM, editor.zoom + 0.1));
        return;
      }
      if (mod(e) && e.key === '-') {
        e.preventDefault();
        editor.setZoom(Math.max(MIN_ZOOM, editor.zoom - 0.1));
        return;
      }
      if (mod(e) && e.key === '0') {
        e.preventDefault();
        editor.setZoom(1);
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (editor.pathEditObjectId) {
          editor.setPathEditObjectId(null);
          editor.setSelectedPathPoint(null);
          editor.setTool('move');
          return;
        }
        if (editor.editingTextId) {
          editor.setEditingTextId(null);
          return;
        }
        doc.clearSelection();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (editor.pathEditObjectId) {
          if (!deleteSelectedPathPoints()) {
            // nothing to delete — ignore rather than deleting whole object
          }
          return;
        }
        if (doc.selectedIds.length) {
          doc.deleteObjects(doc.selectedIds);
        }
        return;
      }

      // Nudge
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        if (!doc.selectedIds.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy =
          e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        if (!e.repeat) doc.pushHistory();
        for (const id of doc.selectedIds) {
          const obj = doc.objects[id];
          if (!obj) continue;
          doc.updateObject(
            id,
            { x: obj.x + dx, y: obj.y + dy },
            { history: false },
          );
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        useEditorStore.getState().setSpacePanning(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      useEditorStore.getState().setSpacePanning(false);
    };
  }, []);
}
