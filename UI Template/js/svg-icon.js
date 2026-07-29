// Inline SVG icons from files — optional stroke / fill / stroke-width overrides
(function initSvgIcons() {
    const ATTR_MAP = {
        stroke: 'stroke',
        fill: 'fill',
        'stroke-width': 'stroke-width',
    };

    const cache = new Map();

    function getOverride(el, name) {
        if (!el.hasAttribute(`data-${name}`)) {
            return null;
        }
        return el.getAttribute(`data-${name}`);
    }

    function applyOverride(svg, attrName, value) {
        if (value === null) {
            return;
        }

        if (svg.hasAttribute(attrName)) {
            svg.setAttribute(attrName, value);
        }

        svg.querySelectorAll(`[${attrName}]`).forEach((node) => {
            node.setAttribute(attrName, value);
        });
    }

    function parseSvg(markup) {
        const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg || doc.querySelector('parsererror')) {
            throw new Error('Invalid SVG markup');
        }
        return document.importNode(svg, true);
    }

    function loadSvg(src) {
        if (cache.has(src)) {
            return cache.get(src);
        }

        const request = fetch(src)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load SVG: ${src}`);
                }
                return response.text();
            })
            .then((text) => parseSvg(text))
            .catch((error) => {
                cache.delete(src);
                throw error;
            });

        cache.set(src, request);
        return request;
    }

    async function injectOne(host) {
        const src = host.getAttribute('data-svg');
        if (!src || host.dataset.svgLoaded === 'true') {
            return;
        }

        host.dataset.svgLoaded = 'true';

        try {
            const template = await loadSvg(src);
            const svg = template.cloneNode(true);

            Object.keys(ATTR_MAP).forEach((dataName) => {
                applyOverride(svg, ATTR_MAP[dataName], getOverride(host, dataName));
            });

            svg.setAttribute('aria-hidden', 'true');
            host.replaceChildren(svg);
        } catch (error) {
            host.dataset.svgLoaded = 'false';
            console.error(error);
        }
    }

    function inject(root = document) {
        const hosts = root.querySelectorAll
            ? root.querySelectorAll('[data-svg]')
            : [];

        return Promise.all(Array.from(hosts).map((host) => injectOne(host)));
    }

    window.SvgIcon = { inject, injectOne };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            inject();
        });
    } else {
        inject();
    }
})();
