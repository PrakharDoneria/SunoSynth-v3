const Player = {
    queue: [],
    currentIndex: -1,
    isShuffle: false,
    isRepeat: false,
    favoriteSongIds: new Set(),
    audio: null,

    init() {
        this.audio = document.getElementById('audioElement');
        this.loadState();
        this.setupEventListeners();
        this.renderPlayIcon(false);
        this._setupMobileControls();
    },

    setupEventListeners() {
        // Progress update
        this.audio.addEventListener('timeupdate', () => {
            if (isNaN(this.audio.duration)) return;
            const pct = (this.audio.currentTime / this.audio.duration) * 100;
            ['progressBarFill','miniProgressFill','npProgressFill'].forEach(id => {
                const el = document.getElementById(id); if (el) el.style.width = `${pct}%`;
            });
            const cur = formatTime(this.audio.currentTime);
            const tot = formatTime(this.audio.duration);
            [['timeCurrent','timeTotal'],['npTimeCurrent','npTimeTotal']].forEach(([c,t]) => {
                const ce = document.getElementById(c); if (ce) ce.textContent = cur;
                const te = document.getElementById(t);  if (te) te.textContent = tot;
            });
        });

        this.audio.addEventListener('ended', () => {
            if (this.isRepeat) { this.audio.currentTime = 0; this.audio.play(); }
            else this.playNext();
        });

        this.audio.addEventListener('play',  () => this.updatePlayState(true));
        this.audio.addEventListener('pause', () => this.updatePlayState(false));

        // Desktop progress click
        const prog = document.getElementById('progressBarBg');
        if (prog) prog.addEventListener('click', (e) => {
            if (!this.audio.src || isNaN(this.audio.duration)) return;
            const r = prog.getBoundingClientRect();
            this.audio.currentTime = ((e.clientX - r.left) / r.width) * this.audio.duration;
        });

        // Desktop volume
        const volTrack = document.getElementById('volumeTrack');
        const volFill  = document.getElementById('volumeFill');
        if (volTrack) {
            volTrack.addEventListener('click', (e) => {
                const r = volTrack.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                this.audio.volume = pct;
                if (volFill) volFill.style.width = `${pct * 100}%`;
            });
        }

        // Desktop controls
        const B = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        B('btnPlay',    () => this.togglePlay());
        B('btnPrev',    () => this.playPrev());
        B('btnNext',    () => this.playNext());
        B('btnShuffle', () => {
            this.isShuffle = !this.isShuffle;
            document.getElementById('btnShuffle')?.classList.toggle('active', this.isShuffle);
            this.saveState();
        });
        B('btnRepeat',  () => {
            this.isRepeat = !this.isRepeat;
            document.getElementById('btnRepeat')?.classList.toggle('active', this.isRepeat);
            this.saveState();
        });
        B('btnMute', () => {
            this.audio.muted = !this.audio.muted;
            const icon = document.querySelector('#btnMute i');
            if (icon) {
                const name = this.audio.muted ? 'volume-x' : 'volume-2';
                icon.setAttribute('data-lucide', name);
                lucide.createIcons();
            }
        });

        // Add to playlist button
        B('btnAddToPlaylist', () => {
            const song = this.getCurrentSong();
            if (song) UI_openAddToPlaylist(song);
        });
        B('btnFavoritePlayer', () => {
            const song = this.getCurrentSong();
            if (song) this.toggleFavorite(song);
        });

        // Full-view button
        document.querySelectorAll('[data-route="now-playing"]').forEach(el => {
            el.addEventListener('click', () => navigateTo('now-playing'));
        });
    },

    _setupMobileControls() {
        const B = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        // Mini player
        B('miniBtnPlay', () => this.togglePlay());
        B('miniBtnPrev', () => this.playPrev());
        B('miniBtnNext', () => this.playNext());

        // Full-screen NP overlay
        B('npBtnPlay',    () => this.togglePlay());
        B('npBtnPrev',    () => this.playPrev());
        B('npBtnNext',    () => this.playNext());
        B('npBtnShuffle', () => {
            this.isShuffle = !this.isShuffle;
            document.getElementById('npBtnShuffle')?.classList.toggle('active', this.isShuffle);
            document.getElementById('btnShuffle')?.classList.toggle('active', this.isShuffle);
        });
        B('npBtnRepeat', () => {
            this.isRepeat = !this.isRepeat;
            document.getElementById('npBtnRepeat')?.classList.toggle('active', this.isRepeat);
            document.getElementById('btnRepeat')?.classList.toggle('active', this.isRepeat);
        });
        B('npBtnFav', () => { const s = this.getCurrentSong(); if (s) this.toggleFavorite(s); });
        B('npBtnAdd', () => { const s = this.getCurrentSong(); if (s) UI_openAddToPlaylist(s); });
        B('npOverlayMore', () => { const s = this.getCurrentSong(); if (s) UI_openAddToPlaylist(s); });

        // Open/close NP overlay tapping mini player
        const mini = document.getElementById('miniPlayer');
        if (mini) mini.addEventListener('click', e => {
            if (e.target.closest('#miniBtnPlay') || e.target.closest('#miniBtnPrev') || e.target.closest('#miniBtnNext')) return;
            if (typeof _NP !== 'undefined') _NP.openOverlay();
        });
        B('closeNpOverlay', () => { if (typeof _NP !== 'undefined') _NP.closeOverlay(); });

        // NP overlay progress
        const npProg = document.getElementById('npProgressBg');
        if (npProg) npProg.addEventListener('click', e => {
            if (!this.audio.src || isNaN(this.audio.duration)) return;
            const r = npProg.getBoundingClientRect();
            this.audio.currentTime = ((e.clientX - r.left) / r.width) * this.audio.duration;
        });
    },

    getCurrentSong() {
        return this.currentIndex >= 0 ? this.queue[this.currentIndex] : null;
    },

    setQueue(q) { this.queue = q; this.saveState(); },

    async playSong(index) {
        if (index < 0 || index >= this.queue.length) return;
        this.currentIndex = index;
        const song = this.queue[index];
        if (!song.download_url) { showToast('Audio not available'); return; }

        // Update all UI
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setImg  = (id, val) => { const el = document.getElementById(id); if (el) el.src = val; };

        setText('playerTitle',  song.title);
        setText('playerArtist', song.artist);
        setText('miniTitle',    song.title);
        setText('miniArtist',   song.artist);

        if (song.image_url) {
            setImg('playerImage', song.image_url);
            setImg('miniArt',     song.image_url);
            const dynBg = document.getElementById('dynamicBg');
            if (dynBg) dynBg.style.backgroundImage = `url('${song.image_url}')`;
        }

        // Show mini player on mobile
        const miniPlayer = document.getElementById('miniPlayer');
        if (miniPlayer) miniPlayer.classList.add('visible');

        // Sync NP overlay if open
        if (typeof _NP !== 'undefined') _NP.syncState();

        // Show loader
        const loader = document.getElementById('playerLoader');
        if (loader) loader.style.display = 'flex';

        this.audio.src = song.download_url;
        API.trackPlay(song);

        try {
            await this.audio.play();
            if (loader) loader.style.display = 'none';
        } catch {
            if (loader) loader.style.display = 'none';
            showToast('Browser blocked autoplay — click Play');
        }
        this.saveState();

        // Update queue display
        this._updatePlayerQueue();
    },

    _updatePlayerQueue() {
        const queueSection = document.getElementById('playerQueueSection');
        const queueList    = document.getElementById('playerQueueList');
        if (!queueSection || !queueList) return;

        const upcoming = this.queue
            .map((s, i) => ({ song: s, idx: i }))
            .filter(e => e.idx > this.currentIndex)
            .slice(0, 5);

        if (!upcoming.length) { queueSection.style.display = 'none'; return; }

        queueSection.style.display = '';
        queueList.innerHTML = '';
        upcoming.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.innerHTML = `
                <img class="queue-thumb" src="${entry.song.image_url || ''}" alt="">
                <div class="queue-info">
                    <div class="queue-title">${entry.song.title}</div>
                    <div class="queue-artist">${entry.song.artist || ''}</div>
                </div>
            `;
            item.addEventListener('click', () => this.playSong(entry.idx));
            queueList.appendChild(item);
        });
    },

    togglePlay() {
        if (!this.audio.src) return;
        this.audio.paused ? this.audio.play() : this.audio.pause();
    },

    async playNext() {
        if (!this.queue.length) return;
        let next = this.currentIndex + 1;
        if (this.isShuffle) next = Math.floor(Math.random() * this.queue.length);
        else if (next >= this.queue.length) {
            showToast('Fetching more similar songs…');
            const seed = this.queue[this.currentIndex];
            const more = await this.enrichQueueFromSeed(seed);
            if (more.length) this.queue.push(...more);
            else next = 0;
        }
        this.playSong(next);
    },

    playPrev() {
        if (!this.queue.length) return;
        if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
        let prev = this.currentIndex - 1;
        if (prev < 0) prev = this.queue.length - 1;
        this.playSong(prev);
    },

    updatePlayState(isPlaying) {
        this.renderPlayIcon(isPlaying);
        const ids = ['mainVinyl','waveBars','miniArt'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle(id==='waveBars'?'active':'playing', isPlaying); });
        // Sync NP overlay art
        const npArt = document.getElementById('npOverlayArt');
        if (npArt) npArt.classList.toggle('playing', isPlaying);
        if (typeof _NP !== 'undefined') _NP.syncState();
    },

    renderPlayIcon(isPlaying) {
        const icon = isPlaying ? 'pause' : 'play';
        ['btnPlay','miniBtnPlay','npBtnPlay'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.innerHTML = `<i data-lucide="${icon}"></i>`;
        });
        lucide.createIcons();
    },

    async toggleFavorite(song) {
        const data = await API.toggleFavorite(song);
        if (data.ok) {
            data.is_favorite ? this.favoriteSongIds.add(song.song_id) : this.favoriteSongIds.delete(song.song_id);
            showToast(data.is_favorite ? '❤️ Added to favorites' : 'Removed from favorites');
            return data.is_favorite;
        }
        return this.isFavorite(song.song_id);
    },

    isFavorite(id) { return this.favoriteSongIds.has(id); },

    async buildUpcomingQueue(songs, selectedIndex, isSearch) {
        const normalized = songs.map(s => normalizeSongData(s, isSearch)).filter(s => s && s.download_url);
        if (selectedIndex < 0 || selectedIndex >= normalized.length) return normalized;
        const selected = normalized[selectedIndex];
        const upcoming = [selected];
        const seen = [selected];
        normalized.forEach((s, i) => {
            if (i === selectedIndex) return;
            if (seen.some(x => isSimilarSong(x, s))) return;
            upcoming.push(s); seen.push(s);
        });
        const enriched = await this.enrichQueueFromSeed(selected, seen);
        upcoming.push(...enriched);
        return upcoming;
    },

    async enrichQueueFromSeed(seed, seen = []) {
        if (!seed) return [];
        if (!seen.length) seen.push(seed);
        const tasks = [];
        if (seed.album_id) tasks.push(API.getAlbum(seed.album_id));
        if (seed.artist_name && seed.artist_name !== '-') {
            tasks.push(API.search(seed.artist_name.split(',')[0].trim()));
        }
        const results = await Promise.allSettled(tasks);
        const newSongs = [];
        results.forEach(r => {
            if (r.status !== 'fulfilled' || !r.value?.ok) return;
            const source = r.value.songs || r.value.results?.filter(i => i.type === 'song') || r.value.topSongs || [];
            source.forEach(s => {
                const n = normalizeSongData(s, !s.download_url);
                if (n?.download_url && !this.queue.some(q => isSimilarSong(q, n)) && !seen.some(q => isSimilarSong(q, n)) && !newSongs.some(q => isSimilarSong(q, n))) {
                    newSongs.push(n);
                }
            });
        });
        return newSongs.slice(0, 10);
    },

    saveState() {
        try {
            localStorage.setItem('sunosynth_v3_state', JSON.stringify({
                queue: this.queue, currentIndex: this.currentIndex,
                currentTime: this.audio?.currentTime || 0,
                isShuffle: this.isShuffle, isRepeat: this.isRepeat
            }));
        } catch {}
    },

    loadState() {
        try {
            const saved = localStorage.getItem('sunosynth_v3_state');
            if (!saved) return;
            const state = JSON.parse(saved);
            this.queue        = state.queue || [];
            this.currentIndex = state.currentIndex ?? -1;
            this.isShuffle    = !!state.isShuffle;
            this.isRepeat     = !!state.isRepeat;

            document.getElementById('btnShuffle')?.classList.toggle('active', this.isShuffle);
            document.getElementById('btnRepeat')?.classList.toggle('active', this.isRepeat);

            if (this.currentIndex >= 0 && this.queue[this.currentIndex]) {
                const song = this.queue[this.currentIndex];
                const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
                const setImg  = (id, v) => { const el = document.getElementById(id); if (el) el.src = v; };
                setText('playerTitle',  song.title);
                setText('playerArtist', song.artist);
                setText('miniTitle',    song.title);
                setText('miniArtist',   song.artist);
                if (song.image_url) {
                    setImg('playerImage', song.image_url);
                    setImg('miniArt',     song.image_url);
                }
                this.audio.src = song.download_url;
                this.audio.currentTime = state.currentTime || 0;
                const mini = document.getElementById('miniPlayer');
                if (mini) mini.classList.add('visible');
            }
        } catch {}
    }
};
