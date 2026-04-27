document.addEventListener('DOMContentLoaded', async () => {
    // Init Storage & UserID
    await StorageManager.init();
    if (window.Recommender) Recommender.init();

    // Init player
    Player.init();

    // Init PWA install flow
    initPWAInstall();

    // Start Server Status Monitor
    initStatusMonitor();

    // Detect initial route from URL path (supports refresh / direct link)
    const rawPath = window.location.pathname;
    const path = rawPath.replace(/^\//,'').replace(/\/$/,'') || 'home';

    let initialRoute = 'home';
    if (path === 'search')                            initialRoute = 'search';
    else if (path === 'library')                      initialRoute = 'library';
    else if (path === 'history')                      initialRoute = 'history';
    else if (path === 'favorites')                    initialRoute = 'favorites';
    else if (path === 'about')                        initialRoute = 'about';
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

function initPWAInstall() {
    let deferredPrompt = null;
    const btnDesktop = document.getElementById('btnInstallApp');
    const btnMobile = document.getElementById('btnInstallAppMobile');

    const setVisible = (visible) => {
        [btnDesktop, btnMobile].forEach((btn) => {
            if (!btn) return;
            btn.style.display = visible ? '' : 'none';
        });
    };

    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    const triggerInstall = async () => {
        if (isStandalone()) {
            showToast('App is already installed');
            return;
        }

        if (!deferredPrompt) {
            showToast('Use browser menu: Add to Home Screen');
            return;
        }

        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        setVisible(false);
    };

    [btnDesktop, btnMobile].forEach((btn) => {
        btn?.addEventListener('click', triggerInstall);
    });

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        setVisible(true);
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        setVisible(false);
        showToast('SunoSynth installed');
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/service-worker.js').catch((err) => {
            console.warn('Service worker registration failed', err);
        });
    }

    if (isStandalone()) {
        setVisible(false);
    }
}

function initStatusMonitor() {
    const dot = document.getElementById('serverStatusDot');
    const text = document.getElementById('serverStatusText');

    async function check() {
        if (dot) {
            dot.className = 'status-dot checking';
        }
        
        const isOnline = await API.ping();
        
        if (dot && text) {
            dot.className = isOnline ? 'status-dot online' : 'status-dot offline';
            text.textContent = isOnline ? 'Online' : 'Offline (Local)';
            
            if (!isOnline) {
                console.warn('Server offline, application running in local/cached mode.');
            }
        }
    }

    // Initial check
    check();
    // 30 second interval
    setInterval(check, 30000);
}
