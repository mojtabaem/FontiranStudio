// Color input — swatch opens the native picker (Chromium's picker has its own
// on-screen eyedropper), the text field accepts a HEX code directly, and the
// dedicated eyedropper button uses the standard EyeDropper API to sample any
// pixel on screen (cursor becomes a dropper) when the browser supports it.
(function initColorInputs() {
    const roots = document.querySelectorAll('.input-control.input-color');
    if (!roots.length) {
        return;
    }

    const HEX_CHARS = /[^0-9a-fA-F]/g;
    const supportsEyeDropper = typeof window.EyeDropper === 'function';

    roots.forEach((root) => {
        const swatch = root.querySelector('.input-color-swatch');
        const native = root.querySelector('.input-color-native');
        const hex = root.querySelector('.input-color-hex');
        const eyedropper = root.querySelector('.input-color-eyedropper');

        if (!swatch || !native || !hex) {
            return;
        }

        let lastValid = normalizeHex(hex.value) || normalizeHex(native.value.slice(1)) || '000000';
        paint(lastValid);

        // Native picker dragging — live preview
        native.addEventListener('input', () => {
            const value = normalizeHex(native.value.slice(1));
            if (!value) {
                return;
            }
            lastValid = value;
            hex.value = value;
            paint(value);
        });

        // Typing — only accept hex characters, don't fight the caret
        hex.addEventListener('input', () => {
            const cleaned = hex.value.replace(HEX_CHARS, '').slice(0, 6).toUpperCase();
            if (cleaned !== hex.value) {
                hex.value = cleaned;
            }
            if (cleaned.length === 3 || cleaned.length === 6) {
                const value = normalizeHex(cleaned);
                lastValid = value;
                native.value = `#${value}`;
                paint(value);
                hex.classList.remove('is-invalid');
            }
        });

        hex.addEventListener('change', () => commit());
        hex.addEventListener('blur', () => commit());
        hex.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit();
            }
            if (event.key === 'Escape') {
                hex.value = lastValid;
                paint(lastValid);
                hex.classList.remove('is-invalid');
                hex.blur();
            }
        });

        if (eyedropper && supportsEyeDropper) {
            eyedropper.classList.add('is-supported');
            eyedropper.addEventListener('click', async () => {
                try {
                    eyedropper.classList.add('is-active');
                    const result = await new window.EyeDropper().open();
                    const value = normalizeHex(result.sRGBHex.slice(1));
                    lastValid = value;
                    hex.value = value;
                    native.value = `#${value}`;
                    paint(value);
                    hex.classList.remove('is-invalid');
                } catch (error) {
                    // user cancelled (Escape) — nothing to do
                } finally {
                    eyedropper.classList.remove('is-active');
                }
            });
        }

        function commit() {
            const cleaned = hex.value.replace(HEX_CHARS, '');
            const value = normalizeHex(cleaned);
            if (!value) {
                hex.value = lastValid;
                paint(lastValid);
                hex.classList.remove('is-invalid');
                return;
            }
            lastValid = value;
            hex.value = value;
            native.value = `#${value}`;
            paint(value);
            hex.classList.remove('is-invalid');
        }

        function paint(value) {
            swatch.style.setProperty('--input-color-value', `#${value}`);
        }
    });

    function normalizeHex(raw) {
        const cleaned = String(raw || '').replace(HEX_CHARS, '');
        if (cleaned.length === 3) {
            return cleaned.split('').map((char) => char + char).join('').toUpperCase();
        }
        if (cleaned.length === 6) {
            return cleaned.toUpperCase();
        }
        return null;
    }
})();
