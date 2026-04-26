document.addEventListener('DOMContentLoaded', () => {
    // Init player
    Player.init();

    // Detect initial route from URL path (supports refresh / direct link)
    const rawPath = window.location.pathname;
    const path = rawPath.replace(/^\//,'').replace(/\/$/,'') || 'home';

    let initialRoute = 'home';
    if (path === 'search')                            initialRoute = 'search';
    else if (path === 'library')                      initialRoute = 'library';
    else if (path === 'favorites')                    initialRoute = 'favorites';
    else if (path === 'now-playing' || path === 'now/playing') initialRoute = 'now-playing';
    else if (path.startsWith('playlist/'))            initialRoute = `playlist-${path.split('/')[1]}`;
    else if (path.startsWith('album/'))               initialRoute = `album-${path.split('/').slice(1).join('-')}`;
    else if (path.startsWith('artist/'))              initialRoute = `artist-${path.split('/').slice(1).join('-')}`;
    else if (path === 'home')                         initialRoute = 'home';

    // Replace the current history entry (don't double-push on first load)
    Router.navigateTo(initialRoute, { replace: true });

    // All [data-route] links (sidebar nav, buttons, etc.)
    document.querySelectorAll('[data-route]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const route = el.dataset.route;
            if (route) Router.navigateTo(route);
        });
    });

    // Bottom navigation buttons
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.dataset.route;
            if (route) Router.navigateTo(route);
        });
    });

    // Desktop player sidebar "Open full view" button
    document.getElementById('btnOpenNP')?.addEventListener('click', () => {
        Router.navigateTo('now-playing');
    });

    // Brand logo → home
    document.querySelector('.brand-logo')?.addEventListener('click', () => Router.navigateTo('home'));

    // Browser back/forward
    window.addEventListener('popstate', e => {
        const route = e.state?.route || 'home';
        Router.currentRoute = null; // force re-render
        Router.navigateTo(route, { replace: true });
    });

    lucide.createIcons();
});
