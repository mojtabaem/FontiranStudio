// Side panels — toggle is-expanded / is-collapsed
(function initSidePanels() {
    document.querySelectorAll('.side-panel .panel-size-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const panel = btn.closest('.side-panel');
            if (!panel) {
                return;
            }

            const willCollapse = panel.classList.contains('is-expanded');
            panel.classList.toggle('is-expanded', !willCollapse);
            panel.classList.toggle('is-collapsed', willCollapse);
        });
    });
})();
