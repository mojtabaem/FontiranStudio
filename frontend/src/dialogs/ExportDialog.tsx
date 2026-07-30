import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useDocumentStore } from '@/document/documentStore';
import { useEditorStore } from '@/editor/editorStore';
import {
  copyPngToClipboard,
  copySvgToClipboard,
  downloadBlob,
  prepareExport,
  svgToPngBlob,
} from '@/export/exportDocument';

type ExportFormat = 'png' | 'svg';

export function ExportDialog() {
  const open = useEditorStore((s) => s.dialogs.export);
  const setDialog = useEditorStore((s) => s.setDialog);
  const exportTarget = useEditorStore((s) => s.exportTarget);
  const showToast = useEditorStore((s) => s.showToast);
  const objects = useDocumentStore((s) => s.objects);
  const order = useDocumentStore((s) => s.order);

  const [format, setFormat] = useState<ExportFormat>('png');
  const [fileName, setFileName] = useState('filename');
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cachedSvg, setCachedSvg] = useState<string | null>(null);
  const [bounds, setBounds] = useState({ width: 4000, height: 2000 });
  const previewUrlRef = useRef<string | null>(null);

  const sizeLabel = useMemo(() => {
    return `${Math.round(bounds.width)}x${Math.round(bounds.height)}px`;
  }, [bounds]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setBusy(true);

    (async () => {
      try {
        const { svg, bounds: b } = await prepareExport(
          objects,
          order,
          exportTarget,
        );
        if (cancelled) return;
        setCachedSvg(svg);
        setBounds({ width: b.width, height: b.height });

        let url: string;
        if (format === 'svg') {
          url = URL.createObjectURL(
            new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
          );
        } else {
          const png = await svgToPngBlob(svg, b.width, b.height);
          if (cancelled) return;
          url = URL.createObjectURL(png);
        }

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch (err) {
        console.error(err);
        if (!cancelled) showToast('پیش‌نمایش خروجی ناموفق بود');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // regenerate when dialog opens / format / target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- objects snapshot at open
  }, [open, format, exportTarget]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const ensurePayload = async () => {
    if (cachedSvg) {
      return { svg: cachedSvg, bounds };
    }
    const prepared = await prepareExport(objects, order, exportTarget);
    setCachedSvg(prepared.svg);
    setBounds({
      width: prepared.bounds.width,
      height: prepared.bounds.height,
    });
    return { svg: prepared.svg, bounds: prepared.bounds };
  };

  const onDownload = async () => {
    try {
      setBusy(true);
      const { svg, bounds: b } = await ensurePayload();
      const base = (fileName.trim() || 'filename').replace(/[\\/:*?"<>|]/g, '-');
      if (format === 'svg') {
        downloadBlob(
          new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
          `${base}.svg`,
        );
      } else {
        const png = await svgToPngBlob(svg, b.width, b.height);
        downloadBlob(png, `${base}.png`);
      }
      showToast('دانلود آغاز شد');
    } catch (err) {
      console.error(err);
      showToast('دانلود ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    try {
      setBusy(true);
      const { svg, bounds: b } = await ensurePayload();
      if (format === 'svg') {
        await copySvgToClipboard(svg);
      } else {
        const png = await svgToPngBlob(svg, b.width, b.height);
        await copyPngToClipboard(png);
      }
      showToast('در کلیپ‌بورد کپی شد');
    } catch (err) {
      console.error(err);
      showToast('کپی ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => setDialog('export', next)}
      className="dialog-export"
      title="دانلود"
      titleIcon="export"
      hideTitle
      footer={
        <>
          <Button
            variant="primary"
            size="lg"
            className="btn-export-download"
            disabled={busy}
            onClick={() => void onDownload()}
          >
            دانلود
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="btn-export-copy"
            disabled={busy}
            onClick={() => void onCopy()}
            icon={<Icon name="copy" />}
          >
            کپی
          </Button>
        </>
      }
    >
      <div className="dialog-export-content">
        <div className="dialog-export-header">
          <img
            src="/assets/img/export-dialog-arrow.svg"
            className="dialog-export-arrow"
            alt=""
          />
        </div>
        <div className="dialog-export-preview">
          <div className="export-preview-image">
            {previewUrl ? (
              <img src={previewUrl} alt="پیش‌نمایش خروجی" />
            ) : (
              <img src="/assets/img/export-preview-placeholder.png" alt="" />
            )}
          </div>
          <div className="export-preview-details">
            <div className="format-size">
              <div className="export-format-selector">
                <button
                  type="button"
                  className={`export-format-btn export-format-btn-png${
                    format === 'png' ? ' is-active' : ''
                  }`}
                  id="export-png"
                  onClick={() => setFormat('png')}
                >
                  PNG
                </button>
                <button
                  type="button"
                  className={`export-format-btn export-format-btn-svg${
                    format === 'svg' ? ' is-active' : ''
                  }`}
                  id="export-svg"
                  onClick={() => setFormat('svg')}
                >
                  SVG
                </button>
              </div>
              <div className="export-size">{sizeLabel}</div>
            </div>
            <div className="export-file-name">
              <input
                className="input-export-file-name"
                type="text"
                id="export-file-name"
                value={fileName}
                maxLength={50}
                placeholder="filename"
                onChange={(e) => setFileName(e.target.value)}
              />
              <div className="export-file-suffix">.{format}</div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
