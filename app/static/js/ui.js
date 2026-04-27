/* ── UI Helpers ── */

function showToast(msg, duration = 2800) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

function setSectionVisibility(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
}

/* ── Big Art Card (popular songs, horizontal scroll) ── */
function createBigCard(song, allSongs, idx) {
    const wrap = document.createElement('div');
    wrap.className = 'big-card';
    wrap.style.animationDelay = `${idx * 0.05}s`;
    wrap.innerHTML = `
        <img src="${song.image_url || ''}" alt="${song.title}" loading="lazy"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'160\\' height=\\'200\\'%3E%3Crect width=\\'160\\' height=\\'200\\' fill=\\'%23181818\\'/%3E%3C/svg%3E'">
        <button class="big-card-play"><i data-lucide="play"></i></button>
        <div class="big-card-info">
            <div class="big-card-title">${song.title}</div>
            <div class="big-card-artist">${song.artist || '—'}</div>
        </div>
    `;
    wrap.addEventListener('click', async () => {
        const queue = await Player.buildUpcomingQueue(allSongs, idx, false);
        Player.setQueue(queue); Player.playSong(0);
    });
    return wrap;
}

/* ── Recent Card (recently listened horizontal scroll) ── */
function createRecentCard(song, allSongs, idx) {
    const wrap = document.createElement('div');
    wrap.className = 'recent-card';
    wrap.innerHTML = `
        <img src="${song.image_url || ''}" alt="${song.title}" loading="lazy"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'140\\' height=\\'140\\'%3E%3Crect width=\\'140\\' height=\\'140\\' fill=\\'%23181818\\'/%3E%3C/svg%3E'">
        <div class="recent-card-info">
            <div class="recent-card-title">${song.title}</div>
            <div class="recent-card-artist">${song.artist || '—'}</div>
        </div>
    `;
    wrap.addEventListener('click', async () => {
        const queue = await Player.buildUpcomingQueue(allSongs, idx, false);
        Player.setQueue(queue); Player.playSong(0);
    });
    return wrap;
}

/* ── Standard Song Card (grid) ── */
function createSongCard(song, allSongs, idx) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.style.animationDelay = `${idx * 0.04}s`;
    const isFav = Player.isFavorite(song.song_id);
    card.innerHTML = `
        <div class="card-art-wrap">
            <img class="card-art" src="${song.image_url || ''}" alt="${song.title}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\'%3E%3Crect width=\\'200\\' height=\\'200\\' fill=\\'%23181818\\'/%3E%3C/svg%3E'">
            <button class="card-play-btn"><i data-lucide="play"></i></button>
            <button class="card-fav-btn ${isFav ? 'active' : ''}"><i data-lucide="heart"></i></button>
        </div>
        <div class="card-title">${song.title}</div>
        <div class="card-subtitle">${song.artist || '—'}</div>
        ${song.language ? `<span class="card-badge">${song.language}</span>` : ''}
    `;
    card.addEventListener('click', async (e) => {
        if (e.target.closest('.card-fav-btn')) return;
        const queue = await Player.buildUpcomingQueue(allSongs, idx, false);
        Player.setQueue(queue); Player.playSong(0);
    });
    card.querySelector('.card-fav-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const state = await Player.toggleFavorite(song);
        btn.classList.toggle('active', state);
    });
    return card;
}

/* ── Song Pill (horizontal scroll) ── */
function createSongPill(song, allSongs, idx) {
    const pill = document.createElement('button');
    pill.className = 'song-pill';
    pill.innerHTML = `
        <img class="song-pill-thumb" src="${song.image_url || ''}" alt="" loading="lazy">
        <div class="song-pill-info">
            <div class="song-pill-title">${song.title}</div>
            <div class="song-pill-artist">${song.artist || '—'}</div>
        </div>
    `;
    pill.addEventListener('click', async () => {
        const queue = await Player.buildUpcomingQueue(allSongs, idx, false);
        Player.setQueue(queue); Player.playSong(0);
    });
    return pill;
}

/* ── Ranked Row ── */
function createRankedRow(song, allSongs, idx) {
    const row = document.createElement('div');
    row.className = 'ranked-row';
    row.innerHTML = `
        <span class="rank-number ${idx < 3 ? 'top' : ''}">${idx + 1}</span>
        <img class="ranked-thumb" src="${song.image_url || ''}" alt="" loading="lazy">
        <div class="ranked-info">
            <div class="ranked-title">${song.title}</div>
            <div class="ranked-artist">${song.artist || '—'}</div>
        </div>
        <span class="ranked-count">${song.play_count ? `${song.play_count}×` : ''}</span>
    `;
    row.addEventListener('click', async () => {
        const queue = await Player.buildUpcomingQueue(allSongs, idx, false);
        Player.setQueue(queue); Player.playSong(0);
    });
    return row;
}

/* ── Render helpers ── */
function renderSongGrid(songs, container) {
    container.innerHTML = '';
    songs.forEach((s, i) => container.appendChild(createSongCard(s, songs, i)));
    lucide.createIcons();
}

function renderPillRow(songs, container) {
    container.innerHTML = '';
    songs.forEach((s, i) => container.appendChild(createSongPill(s, songs, i)));
}

function renderRankedList(songs, container) {
    container.innerHTML = '';
    songs.forEach((s, i) => container.appendChild(createRankedRow(s, songs, i)));
}

/* ── Nav highlight ── */
function setActiveNav(route) {
    const base = route.split('-')[0];
    const map = { home:'home', search:'search', library:'library', history:'history', favorites:'favorites', about:'about', now:'home', playlist:'library', album:'search', artist:'search' };
    const key = map[base] || 'home';

    // Desktop
    document.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
    const dEl = document.getElementById(`dnav-${key}`);
    if (dEl) dEl.classList.add('active');

    // Mobile
    document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
    const mEl = document.getElementById(`mnav-${key}`);
    if (mEl) mEl.classList.add('active');
}

/* ── Add to Playlist Modal ── */
async function UI_openAddToPlaylist(song) {
    const modal = document.getElementById('addToPlaylistModal');
    const list  = document.getElementById('modalPlaylistsList');
    if (!modal || !list) return;
    modal.classList.add('show');
    list.innerHTML = '<div class="loading-spinner"><i data-lucide="loader-2" class="spin"></i></div>';
    lucide.createIcons();

    const data = await API.getPlaylists();
    list.innerHTML = '';
    if (!data.playlists.length) {
        list.innerHTML = '<p class="text-muted text-sm" style="text-align:center;padding:20px">No playlists yet. Create one first.</p>';
    } else {
        data.playlists.forEach(p => {
            const item = document.createElement('div');
            item.className = 'modal-playlist-item';
            item.innerHTML = `
                <div class="modal-playlist-icon"><i data-lucide="music-4"></i></div>
                <div class="modal-playlist-info"><h4>${p.name}</h4><p>${p.song_count} songs</p></div>
            `;
            item.addEventListener('click', async () => {
                const r = await API.addSongToPlaylist(p.id, song);
                modal.classList.remove('show');
                showToast(r.status === 400 ? 'Already in playlist' : `Added to "${p.name}"`);
            });
            list.appendChild(item);
        });
    }
    lucide.createIcons();
    document.getElementById('btnCancelAdd').onclick = () => modal.classList.remove('show');
}
async function UI_confirm(title, message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        const t = document.getElementById('confirmTitle');
        const m = document.getElementById('confirmMessage');
        const btnOk = document.getElementById('btnConfirmAction');
        const btnNo = document.getElementById('btnConfirmCancel');
        
        if (!modal || !btnOk || !btnNo) return resolve(confirm(message));

        t.textContent = title;
        m.textContent = message;
        modal.classList.add('show');

        const cleanup = (val) => {
            modal.classList.remove('show');
            btnOk.removeEventListener('click', ok);
            btnNo.removeEventListener('click', no);
            resolve(val);
        };
        const ok = () => cleanup(true);
        const no = () => cleanup(false);

        btnOk.addEventListener('click', ok);
        btnNo.addEventListener('click', no);
        modal.addEventListener('click', e => { if (e.target === modal) no(); }, {once: true});
    });
}
