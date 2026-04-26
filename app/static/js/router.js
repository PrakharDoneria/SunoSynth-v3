const Router = {
    currentRoute: null,

    /* Map a route key → clean browser URL path */
    _toUrl(route) {
        if (route === 'home')           return '/';
        if (route === 'search')         return '/search';
        if (route === 'library')        return '/library';
        if (route === 'favorites')      return '/favorites';
        if (route === 'now-playing')    return '/now-playing';
        if (route.startsWith('playlist-')) return `/playlist/${route.split('-')[1]}`;
        if (route.startsWith('album-'))    return `/album/${route.split('-').slice(1).join('-')}`;
        if (route.startsWith('artist-'))   return `/artist/${route.split('-').slice(1).join('-')}`;
        return '/';
    },

    async navigateTo(route, { replace = false } = {}) {
        if (this.currentRoute === route) return;

        // On mobile, now-playing opens the overlay instead of navigating
        const isMobile = window.innerWidth < 900;
        if (route === 'now-playing' && isMobile) {
            _NP.openOverlay(); return;
        }

        const content = document.getElementById('app-content');
        if (!content) return;

        // Transition out
        content.classList.add('view-exit');
        const lt = document.getElementById('liquidTransition');
        if (lt) { lt.classList.add('active'); setTimeout(() => lt.classList.remove('active'), 500); }
        await new Promise(r => setTimeout(r, 180));
        content.classList.remove('view-exit');
        content.innerHTML = '';

        this.currentRoute = route;
        setActiveNav(route);

        // Push/replace URL
        const url = this._toUrl(route);
        if (replace) {
            window.history.replaceState({ route }, '', url);
        } else {
            window.history.pushState({ route }, '', url);
        }

        // Determine which partial to fetch
        let partial = 'home', extraId = null;
        if (route === 'search')             partial = 'search';
        else if (route === 'library')       partial = 'library';
        else if (route === 'favorites')     partial = 'favorites';
        else if (route === 'now-playing')   partial = 'now_playing';
        else if (route.startsWith('playlist-')) { partial = 'playlist'; extraId = route.split('-')[1]; }
        else if (route.startsWith('album-'))    { partial = 'album';    extraId = route.split('-').slice(1).join('-'); }
        else if (route.startsWith('artist-'))   { partial = 'artist';   extraId = route.split('-').slice(1).join('-'); }

        try {
            const res = await fetch(`/partial/${partial}`);
            content.innerHTML = await res.text();
        } catch {
            content.innerHTML = '<div class="empty-state"><p class="text-muted">Failed to load page.</p></div>';
            return;
        }

        content.classList.add('view-enter');
        setTimeout(() => content.classList.remove('view-enter'), 400);

        lucide.createIcons();
        if (partial === 'home')             Views.initHome();
        else if (partial === 'search')      Views.initSearch();
        else if (partial === 'library')     Views.initLibrary();
        else if (partial === 'favorites')   Views.initFavorites();
        else if (partial === 'now_playing') Views.initNowPlaying();
        else if (partial === 'playlist')    Views.initPlaylistDetail(extraId);
        else if (partial === 'album')       Views.initAlbum(extraId);
        else if (partial === 'artist')      Views.initArtist(extraId);

        content.scrollTop = 0;
    }
};

window.navigateTo = r => Router.navigateTo(r);

/* ══════════════════════════════════
   Mobile Now-Playing Overlay Manager
══════════════════════════════════ */
const _NP = {
    openOverlay() {
        const overlay = document.getElementById('npOverlay');
        if (!overlay) return;
        overlay.classList.add('open');
        this.syncState();
    },
    closeOverlay() {
        const overlay = document.getElementById('npOverlay');
        if (overlay) overlay.classList.remove('open');
    },
    syncState() {
        const el = x => document.getElementById(x);
        if (Player.currentIndex < 0 || !Player.queue[Player.currentIndex]) return;
        const song = Player.queue[Player.currentIndex];
        const art = el('npOverlayArt');
        if (art) { art.src = song.image_url || ''; art.classList.toggle('playing', !Player.audio.paused); }
        if (el('npOverlayTitle'))  el('npOverlayTitle').textContent  = song.title;
        if (el('npOverlayArtist')) el('npOverlayArtist').textContent = song.artist || '';
    }
};
window._NP = _NP;
