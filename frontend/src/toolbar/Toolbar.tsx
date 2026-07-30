import { Icon } from '@/components/Icon';
import { Stepper } from '@/components/Stepper';
import { HintTooltip, Tooltip } from '@/components/Tooltip';
import { useAuthStore } from '@/auth/authStore';
import { useEditorStore } from '@/editor/editorStore';
import { MAX_ZOOM, MIN_ZOOM, type Tool } from '@/document/types';

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const pathEditObjectId = useEditorStore((s) => s.pathEditObjectId);
  const setPathEditObjectId = useEditorStore((s) => s.setPathEditObjectId);
  const setSelectedPathPoint = useEditorStore((s) => s.setSelectedPathPoint);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const openDialog = useEditorStore((s) => s.openDialog);
  const setExportTarget = useEditorStore((s) => s.setExportTarget);
  const user = useAuthStore((s) => s.user);

  const selectTool = (t: Tool) => {
    if (t !== 'path') {
      setPathEditObjectId(null);
      setSelectedPathPoint(null);
    }
    setTool(t);
  };

  const moveActive = tool === 'move' && !pathEditObjectId;
  const pathActive = tool === 'path' || Boolean(pathEditObjectId);

  const toolBtn = (t: Tool, icon: string, active: boolean, extraClass: string) => (
    <button
      type="button"
      className={`toolbar-item ${extraClass}${active ? ' is-active' : ''}`}
      onClick={() => selectTool(t)}
    >
      <Icon name={icon} />
    </button>
  );

  return (
    <section className="toolbar" id="toolbar">
      <div className="toolbar-inner">
        <div className="toolbar-stream toolbar-stream-main">
          <HintTooltip items={[{ label: 'Move', keys: ['V'] }]}>
            {toolBtn('move', 'cursor', moveActive, 'toolbar-item-move')}
          </HintTooltip>
          <HintTooltip
            items={[{ label: 'Hand', keys: ['H'], orHold: 'Space' }]}
          >
            {toolBtn('hand', 'hand', tool === 'hand', 'toolbar-item-hand')}
          </HintTooltip>
          <HintTooltip items={[{ label: 'Text', keys: ['T'] }]}>
            {toolBtn('text', 'text', tool === 'text', 'toolbar-item-text')}
          </HintTooltip>
          {pathActive ? (
            <button
              type="button"
              className="toolbar-item toolbar-item-path is-active"
              title="Path"
              onClick={() => selectTool('path')}
            >
              <Icon name="cut" />
            </button>
          ) : null}
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-stream toolbar-stream-view">
          <HintTooltip
            items={[
              { label: 'Zoom in', keys: ['Ctrl', '+'] },
              { label: 'Zoom out', keys: ['Ctrl', '-'] },
              { label: 'Reset to 100%', keys: ['Ctrl', '0'] },
            ]}
          >
            <button
              type="button"
              className="toolbar-item toolbar-item-zoom"
              id="tool-zoom"
              onClick={() => setZoom(1)}
            >
              <Icon name="zoom" />
            </button>
          </HintTooltip>
          <Stepper
            className="zoom-stepper toolbar-zoom-stepper"
            id="canvas-zoom"
            value={zoom}
            onChange={setZoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            displayScale={100}
          />
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-stream toolbar-stream-extras">
          <Tooltip content={user ? 'حساب کاربری' : 'ورود به حساب کاربری'}>
            <button
              type="button"
              className={`toolbar-btn user-btn ${user ? 'is-login' : 'is-logout'}`}
              id="user-btn"
              onClick={() => openDialog(user ? 'profile' : 'login')}
            >
              <Icon name="user2" />
            </button>
          </Tooltip>
          <button
            type="button"
            className="toolbar-btn export-btn"
            id="export-btn"
            onClick={() => {
              setExportTarget('design');
              openDialog('export');
            }}
          >
            <Icon name="export" />
            <div className="text">دانلود</div>
          </button>
        </div>
      </div>
    </section>
  );
}
