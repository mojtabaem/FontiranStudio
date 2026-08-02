// Slider — the range input owns min/max/step, the number input mirrors it
(function initSliders() {
    const roots = document.querySelectorAll('.input-control.input-slider');
    if (!roots.length) {
        return;
    }

    roots.forEach((root) => {
        const range = root.querySelector('.input-slider-range');
        if (!range) {
            return;
        }

        const number = root.querySelector('.input-slider-number');
        const config = readConfig(range);

        if (number) {
            number.min = String(config.min);
            number.max = String(config.max);
            number.step = range.step || 'any';
        }

        commit(range.value);

        range.addEventListener('input', () => {
            paintProgress(root, range, config);
            if (number) {
                number.value = range.value;
            }
        });

        if (!number) {
            return;
        }

        // While typing, only follow along when the text is already a usable value.
        // Partial entries ("", "-", "1.") must survive untouched or the caret fights the user.
        number.addEventListener('input', () => {
            const typed = Number(number.value);
            if (number.value === '' || Number.isNaN(typed)) {
                return;
            }
            if (typed < config.min || typed > config.max) {
                return;
            }
            range.value = String(typed);
            paintProgress(root, range, config);
        });

        number.addEventListener('change', () => commit(number.value));
        number.addEventListener('blur', () => commit(number.value));

        number.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit(number.value);
            }
            if (event.key === 'Escape') {
                commit(range.value);
                number.blur();
            }
        });

        function commit(rawValue) {
            const next = normalize(rawValue, config, range.value);
            range.value = String(next);
            if (number) {
                number.value = String(next);
            }
            paintProgress(root, range, config);
        }
    });

    function readConfig(range) {
        const min = fallbackNumber(range.min, 0);
        const max = fallbackNumber(range.max, 100);
        const step = range.step === 'any' ? 0 : Math.abs(fallbackNumber(range.step, 1));

        return {
            min: Math.min(min, max),
            max: Math.max(min, max),
            step,
            decimals: countDecimals(step),
        };
    }

    function normalize(rawValue, config, fallback) {
        const value = Number(String(rawValue).trim());
        if (String(rawValue).trim() === '' || Number.isNaN(value)) {
            return Number(fallback);
        }

        const clamped = Math.min(config.max, Math.max(config.min, value));
        if (!config.step) {
            return clamped;
        }

        // Steps are measured from min, which is what the browser does for range inputs.
        const snapped = config.min + Math.round((clamped - config.min) / config.step) * config.step;
        const rounded = Number(snapped.toFixed(config.decimals));
        return Math.min(config.max, Math.max(config.min, rounded));
    }

    function paintProgress(root, range, config) {
        const span = config.max - config.min;
        const progress = span === 0 ? 0 : ((Number(range.value) - config.min) / span) * 100;
        root.style.setProperty('--slider-progress', `${progress}%`);
    }

    function fallbackNumber(rawValue, fallback) {
        if (String(rawValue).trim() === '') {
            return fallback;
        }
        const value = Number(rawValue);
        return Number.isFinite(value) ? value : fallback;
    }

    function countDecimals(step) {
        const [, decimals = ''] = String(step).split('.');
        return decimals.length;
    }
})();
