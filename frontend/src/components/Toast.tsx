import { useEditorStore } from '@/editor/editorStore';

export function Toast() {
  const toast = useEditorStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
