// Side panels — expand/collapse + overlay custom scrollbar
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

            requestAnimationFrame(() => {
                panel.querySelectorAll('.side-panel-content').forEach(syncScrollbar);
            });
        });
    });

    document.querySelectorAll('.side-panel-content').forEach((content) => {
        setupOverlayScrollbar(content);
    });

    // Coalesce resize storms (window + font/SVG layout) into one frame
    let resizeFrame = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            document.querySelectorAll('.side-panel-content').forEach(syncScrollbar);
        });
    });

    function setupOverlayScrollbar(content) {
        if (content.dataset.scrollbarReady) {
            return;
        }
        content.dataset.scrollbarReady = 'true';

        const scroll = document.createElement('div');
        scroll.className = 'side-panel-scroll';
        while (content.firstChild) {
            scroll.appendChild(content.firstChild);
        }
        content.appendChild(scroll);

        const track = document.createElement('div');
        track.className = 'side-panel-scrollbar';
        track.setAttribute('aria-hidden', 'true');
        const thumb = document.createElement('div');
        thumb.className = 'side-panel-scrollbar-thumb';
        track.appendChild(thumb);
        content.appendChild(track);

        content._scrollEl = scroll;
        content._thumbEl = thumb;

        let hideTimer;
        let scrollFrame = 0;
        const onScroll = () => {
            cancelAnimationFrame(scrollFrame);
            scrollFrame = requestAnimationFrame(() => {
                syncScrollbar(content);
                content.classList.add('is-scrolling');
                clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    content.classList.remove('is-scrolling');
                }, 800);
            });
        };

        scroll.addEventListener('scroll', onScroll, { passive: true });

        if (typeof ResizeObserver !== 'undefined') {
            let roFrame = 0;
            const observer = new ResizeObserver(() => {
                cancelAnimationFrame(roFrame);
                roFrame = requestAnimationFrame(() => syncScrollbar(content));
            });
            observer.observe(scroll);
            if (scroll.firstElementChild) {
                observer.observe(scroll.firstElementChild);
            }
        }

        syncScrollbar(content);
    }

    function syncScrollbar(content) {
        const scroll = content._scrollEl || content.querySelector('.side-panel-scroll');
        const thumb = content._thumbEl || content.querySelector('.side-panel-scrollbar-thumb');
        if (!scroll || !thumb) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = scroll;
        const hasOverflow = scrollHeight > clientHeight + 1;
        content.classList.toggle('has-overflow', hasOverflow);

        if (!hasOverflow) {
            thumb.style.height = '0px';
            thumb.style.transform = '';
            return;
        }

        const ratio = clientHeight / scrollHeight;
        const thumbHeight = Math.max(24, clientHeight * ratio);
        const maxTop = clientHeight - thumbHeight;
        const thumbTop = maxTop * (scrollTop / (scrollHeight - clientHeight || 1));

        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${thumbTop}px)`;
    }
})();
