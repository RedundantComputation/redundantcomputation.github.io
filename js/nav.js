/**
 * Navigation — mobile toggle + active tab highlighting
 */
(function () {
    // Mobile hamburger toggle
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('open');
            links.classList.toggle('open');
        });

        // Close menu when a link is clicked
        links.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                toggle.classList.remove('open');
                links.classList.remove('open');
            });
        });
    }

    // Active tab — highlight based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === currentPage);
    });
})();
