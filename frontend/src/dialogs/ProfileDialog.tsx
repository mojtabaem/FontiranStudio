import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useAuthStore } from '@/auth/authStore';
import { useEditorStore } from '@/editor/editorStore';

export function ProfileDialog() {
  const open = useEditorStore((s) => s.dialogs.profile);
  const setDialog = useEditorStore((s) => s.setDialog);
  const closeDialog = useEditorStore((s) => s.closeDialog);
  const openDialog = useEditorStore((s) => s.openDialog);
  const user = useAuthStore((s) => s.user);
  const fonts = useAuthStore((s) => s.fonts);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => setDialog('profile', next)}
      className="dialog-profile"
      title="حساب کاربری"
      titleIcon="user"
      footer={
        <>
          <Button
            size="lg"
            className="btn-login-redirect"
            onClick={() => {
              // TODO: wire Fontiran storefront URL from config
              window.open('https://fontiran.com', '_blank', 'noopener,noreferrer');
            }}
            icon={<Icon name="fontiran" />}
          >
            خرید فونت
          </Button>
          <Button
            variant="primary"
            size="lg"
            tone="danger"
            className="btn-logout"
            onClick={async () => {
              await logout();
              closeDialog('profile');
              openDialog('login');
            }}
            icon={<Icon name="logout" />}
          >
            خروج
          </Button>
        </>
      }
    >
      <div className="dialog-profile-content">
        <div className="user-profile-card">
          <div className="user-profile-info">
            <div className="user-avatar">
              <img
                src={user?.avatarUrl || '/assets/img/default-avatar.png'}
                alt="User Avatar"
              />
            </div>
            <div className="user-details">
              <div className="user-phone">{user?.phone || '—'}</div>
              <div className="user-email">{user?.email || '—'}</div>
            </div>
          </div>
          <a
            href={user?.profileUrl || 'https://fontiran.com'}
            target="_blank"
            rel="noreferrer"
            className="user-profile-link"
            title="مشاهده پروفایل در فونت‌ایران"
          >
            <Icon name="outerlink2" />
          </a>
        </div>
        <div className="user-fonts">
          <div className="user-fonts-header">
            <div className="title">فونت‌های شما</div>
          </div>
          <div className="user-fonts-list">
            {fonts.length === 0 ? (
              <div className="empty-state">
                <div className="icon">
                  <img src="/assets/img/fonts-empty-state.svg" alt="" />
                </div>
                <div className="text">شما هیچ فونتی در فونت‌ایران خریداری نکرده‌اید.</div>
              </div>
            ) : (
              fonts.map((font) => (
                <div className="user-font-item" key={font.id}>
                  <div className="font-title">{font.name}</div>
                  <div className="font-type">
                    {font.isVariable ? 'متغیر' : `${font.faces.length} وزن`}
                  </div>
                  <a
                    href={
                      font.fontiranId
                        ? `https://fontiran.com/font/${font.fontiranId}`
                        : '#'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="font-link"
                    title="مشاهده در فونت‌ایران"
                  >
                    <Icon name="outerlink" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
