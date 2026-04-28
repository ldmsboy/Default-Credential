import '../css/main.css';
async function loadComponent(url, element) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        element.insertAdjacentHTML('afterbegin', data);
    } catch (error) {
        console.error(`Error loading component from ${url}:`, error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- CARGA DE COMPONENTES ---
    const path = window.location.pathname;
    if (path.includes('guia.html')) {
        await loadComponent('guia-header.html', document.body);
    } else {
        await loadComponent('header.html', document.body);
    }

    // --- LÓGICA COMÚN DE UI ---

    const copyrightYear = document.getElementById('copyright-year');
    if (copyrightYear) {
        copyrightYear.textContent = new Date().getFullYear();
    }

    const backToTopButton = document.getElementById('back-to-top');
    const footer = document.getElementById('page-footer');
    const header = document.getElementById('main-header');

    if (!backToTopButton || !footer || !header) {
        return;
    }

    const footerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (backToTopButton.classList.contains('visible')) {
                backToTopButton.classList.toggle('collided', entry.isIntersecting);
            }
        });
    }, { threshold: 0.1 });
    footerObserver.observe(footer);

    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);

        if (window.scrollY > 300) {
            if (!backToTopButton.classList.contains('visible')) {
                backToTopButton.classList.add('visible');
                // Re-evaluar la colisión al hacerse visible
                if (footerObserver.takeRecords().some(e => e.isIntersecting)) {
                    backToTopButton.classList.add('collided');
                }
            }
        } else {
            backToTopButton.classList.remove('visible', 'collided');
        }
    });
});