import { useEffect } from 'react';
import { useAuthStore } from '@/auth/authStore';
import { Canvas } from '@/canvas/Canvas';
import { Toast } from '@/components/Toast';
import { useDocumentStore } from '@/document/documentStore';
import { ExportDialog } from '@/dialogs/ExportDialog';
import { LoginDialog } from '@/dialogs/LoginDialog';
import { ProfileDialog } from '@/dialogs/ProfileDialog';
import { useEditorStore } from '@/editor/editorStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { LayersPanel } from '@/panels/LayersPanel';
import { PropertyPanel } from '@/panels/PropertyPanel';
import {
  loadNewestDesign,
  startAutosave,
} from '@/persist/autosave';
import { Toolbar } from '@/toolbar/Toolbar';

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const token = useAuthStore((s) => s.token);
  const openDialog = useEditorStore((s) => s.openDialog);
  const loadDocument = useDocumentStore((s) => s.loadDocument);

  useKeyboardShortcuts();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await restoreSession();
      if (cancelled) return;

      if (!ok) {
        openDialog('login');
      }

      const newest = await loadNewestDesign();
      if (newest && !cancelled) {
        loadDocument(newest);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restoreSession, openDialog, loadDocument]);

  useEffect(() => {
    const autosave = startAutosave({
      getToken: () => useAuthStore.getState().token,
    });
    return () => autosave.stop();
  }, [token]);

  return (
    <div className="app" id="app">
      <Canvas />
      <section className="sidebar" id="sidebar">
        <div className="sidebar-inner">
          <PropertyPanel />
          <LayersPanel />
        </div>
      </section>
      <Toolbar />
      <LoginDialog />
      <ProfileDialog />
      <ExportDialog />
      <Toast />
    </div>
  );
}
