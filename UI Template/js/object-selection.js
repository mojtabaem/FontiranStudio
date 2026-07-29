// Temporary object selection — click to select, click outside/another object to clear
(function initObjectSelection() {
    document.addEventListener('click', (event) => {
        const object = event.target.closest('.object');

        document.querySelectorAll('.object.object-selected').forEach((el) => {
            if (el !== object) {
                el.classList.remove('object-selected');
            }
        });

        if (object) {
            object.classList.add('object-selected');
        }
    });
})();
