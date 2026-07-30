import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useAuthStore } from '@/auth/authStore';
import { useEditorStore } from '@/editor/editorStore';

export function LoginDialog() {
  const open = useEditorStore((s) => s.dialogs.login);
  const setDialog = useEditorStore((s) => s.setDialog);
  const closeDialog = useEditorStore((s) => s.closeDialog);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const showToast = useEditorStore((s) => s.showToast);

  // Login is required — prevent dismiss until authenticated
  const required = !user;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && required) return;
        setDialog('login', next);
      }}
      className="dialog-login"
      title="ورود به حساب کاربری"
      titleIcon="user"
      showClose={!required}
      footer={
        <Button
          variant="primary"
          size="lg"
          className="btn-login-redirect"
          disabled={loading}
          onClick={async () => {
            try {
              await login();
              closeDialog('login');
              showToast('ورود موفق');
            } catch {
              showToast('ورود ناموفق بود');
            }
          }}
          icon={<Icon name="outerlink" />}
        >
          ورود از طریق فونت‌ایران
        </Button>
      }
    >
      <div className="dialog-login-content">
        <p className="text">
          برای استفاده از فونت‌استودیو باید به حساب کاربری خود در فونت‌ایران وارد شوید.
        </p>
      </div>
    </Dialog>
  );
}
