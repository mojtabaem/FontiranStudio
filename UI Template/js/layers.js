// Layers — toggle is-visible / is-hidden
(function initLayerVisibility() {
    const stream = document.getElementById('layers-stream');
    if (!stream) {
        return;
    }

    stream.addEventListener('click', (event) => {
        const btn = event.target.closest('.layer-item-btn-eye');
        if (!btn || !stream.contains(btn)) {
            return;
        }

        const item = btn.closest('.layer-item');
        if (!item) {
            return;
        }

        event.stopPropagation();

        const willHide = item.classList.contains('is-visible');
        item.classList.toggle('is-visible', !willHide);
        item.classList.toggle('is-hidden', willHide);
        btn.setAttribute('aria-pressed', String(!willHide));
        btn.setAttribute(
            'aria-label',
            willHide ? 'نمایش لایه' : 'مخفی کردن لایه'
        );
    });
})();
