// Native <dialog> open/close — same class names as Radix Dialog parts in dialog.css
(function initDialogs() {
    document.querySelectorAll('[data-dialog-open]').forEach((trigger) => {
        const dialogId = trigger.getAttribute('data-dialog-open');
        const dialog = dialogId ? document.getElementById(dialogId) : null;
        if (!dialog) {
            return;
        }

        trigger.addEventListener('click', () => {
            dialog.showModal();
        });
    });

    document.querySelectorAll('dialog.dialog').forEach((dialog) => {
        dialog.querySelectorAll('[data-dialog-close]').forEach((closeBtn) => {
            closeBtn.addEventListener('click', () => {
                dialog.close();
            });
        });

        // Click outside content (on the transparent dialog shell) closes — like Radix overlay click
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) {
                dialog.close();
            }
        });
    });
})();
