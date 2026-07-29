// Default tippy — plain text via data-tippy-content
(function initDefaultTippy() {
    if (typeof tippy === 'undefined') {
        return;
    }

    const targets = document.querySelectorAll('[data-tippy-content]');
    if (!targets.length) {
        return;
    }

    tippy(targets, {
        theme: 'default-tippy',
        animation: 'scale',
        placement: 'top',
        arrow: true,
        offset: [0, 10],
        duration: [100, 100],
        delay: [250, 100],
        // Native <dialog> is top-layer; body-appended tips sit underneath
        appendTo: (reference) => reference.closest('dialog') || document.body,
    });
})();

// Hint tippy — HTML templates + singleton via data-tippy-hint-template
(function initHintTippy() {
    if (typeof tippy === 'undefined' || typeof tippy.createSingleton !== 'function') {
        return;
    }

    const targets = document.querySelectorAll('[data-tippy-hint-template]');
    if (!targets.length) {
        return;
    }

    const getTemplateContent = (reference) => {
        const templateId = reference.getAttribute('data-tippy-hint-template');
        const template = templateId ? document.getElementById(templateId) : null;
        return template ? template.innerHTML : '';
    };

    const instances = tippy(targets, {
        theme: 'hint-tippy',
        allowHTML: true,
        animation: 'scale',
        placement: 'top',
        arrow: false,
        offset: [0, 10],
        duration: [150, 100],
        content: getTemplateContent,
        appendTo: (reference) => reference.closest('dialog') || document.body,
    });

    tippy.createSingleton(instances, {
        theme: 'hint-tippy',
        allowHTML: true,
        animation: 'scale',
        placement: 'top',
        arrow: true,
        offset: [0, 10],
        duration: [150, 100],
        delay: [1000, 150],
        moveTransition: 'transform 0.2s ease-out',
        overrides: ['placement'],
        appendTo: () => document.body,
    });
})();
