const Player = {
    queue: [],
    currentIndex: -1,
    isShuffle: false,
    isRepeat: false,
    favoriteSongIds: new Set(),
    isAutoFillingQueue: false,
    _lastPersistAt: 0,
    audio: null,
    _persistIntervalMs: 1000,

    init() {
        this.audio = document.getElementById('audioElement');
        if (this.audio) this.audio.preload = 'auto';
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

            const now = Date.now();
            if (now - this._lastPersistAt > this._persistIntervalMs) {
                this._lastPersistAt = now;
                this.saveState();
            }
        });

        this.audio.addEventListener('ended', () => {
            if (this.isRepeat) { this.audio.currentTime = 0; this.audio.play(); }
            else this.playNext();
        });

        this.audio.addEventListener('play',  () => {
            this.updatePlayState(true);
            this.saveState();
        });
        this.audio.addEventListener('pause', () => {
            this.updatePlayState(false);
            this.saveState();
        });
        this.audio.addEventListener('ended', () => this.saveState());
        this.audio.addEventListener('canplay', () => {
            const loader = document.getElementById('playerLoader');
            if (loader) loader.style.display = 'none';
        });

        window.addEventListener('beforeunload', () => this.saveState());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.saveState();
        });

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

        // Clear mobile queue
        B('npBtnClearQueue', () => {
            if (this.queue.length > this.currentIndex + 1) {
                this.queue.splice(this.currentIndex + 1);
                this._updatePlayerQueue();
                showToast('Queue cleared');
            }
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

        const safeTitle = decodeHTMLEntities(song.title || 'Unknown Title');
        const safeArtist = decodeHTMLEntities(song.artist || 'Unknown Artist');
        setText('playerTitle',  safeTitle);
        setText('playerArtist', safeArtist);
        setText('miniTitle',    safeTitle);
        setText('miniArtist',   safeArtist);

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

        this.audio.pause();
        this.audio.src = song.download_url;
        this.audio.load();
        if (window.Recommender) Recommender.learnFromSong(song, 'play');
        API.trackPlay(song);

        this.syncFavoriteUI(song.song_id);

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
        this._updateDesktopQueue();
        this._updateMobileQueue();
    },

    _updateDesktopQueue() {
        const queueSection = document.getElementById('playerQueueSection');
        const queueList    = document.getElementById('playerQueueList');
        if (!queueSection || !queueList) return;

        const upcoming = this.queue
            .map((s, i) => ({ song: s, idx: i }))
            .filter(e => e.idx > this.currentIndex)
            .slice(0, 12);

        if (!upcoming.length) {
            queueSection.style.display = 'none';
            if (!this.isAutoFillingQueue) {
                const seed = this.getCurrentSong();
                this.ensureAutoUpcoming(seed).then((added) => {
                    if (added) this._updatePlayerQueue();
                });
            }
            return;
        }

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
                <div class="queue-item-actions">
                    <button class="queue-action-btn action-play-next" title="Play next"><i data-lucide="arrow-up-circle"></i></button>
                    <button class="queue-action-btn action-similar" title="Add similar"><i data-lucide="sparkles"></i></button>
                    <button class="queue-action-btn action-remove" title="Remove from queue"><i data-lucide="x"></i></button>
                </div>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.queue-item-actions')) return;
                this.playSong(entry.idx);
            });
            item.querySelector('.action-remove')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromQueueAt(entry.idx);
                this._updatePlayerQueue();
                showToast('Removed from queue');
            });
            item.querySelector('.action-play-next')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveToPlayNext(entry.idx);
                this._updatePlayerQueue();
                showToast('Will play next');
            });
            item.querySelector('.action-similar')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const count = await this.addSimilarAfter(entry.idx, 4);
                this._updatePlayerQueue();
                showToast(count ? `Added ${count} similar songs` : 'No similar songs found');
            });
            queueList.appendChild(item);
        });
        lucide.createIcons();
    },

    _updateMobileQueue() {
        const queueSection = document.getElementById('npQueueSection');
        const queueList    = document.getElementById('npQueueList');
        if (!queueSection || !queueList) return;

        const upcoming = this.queue
            .map((s, i) => ({ song: s, idx: i }))
            .filter(e => e.idx > this.currentIndex)
            .slice(0, 15);

        if (!upcoming.length) {
            queueSection.style.display = 'none';
            return;
        }

        queueSection.style.display = '';
        queueList.innerHTML = '';
        upcoming.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'np-queue-item';
            item.innerHTML = `
                <img class="np-queue-thumb" src="${entry.song.image_url || ''}" alt="">
                <div class="np-queue-info">
                    <div class="np-queue-song-title">${entry.song.title}</div>
                    <div class="np-queue-song-artist">${entry.song.artist || ''}</div>
                </div>
                <div class="np-queue-actions">
                    <button class="np-queue-btn action-remove"><i data-lucide="x"></i></button>
                </div>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.np-queue-actions')) return;
                this.playSong(entry.idx);
            });
            item.querySelector('.action-remove')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromQueueAt(entry.idx);
                this._updatePlayerQueue();
                showToast('Removed');
            });
            queueList.appendChild(item);
        });
        lucide.createIcons();
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
            const seed = this.queue[this.currentIndex];
            const added = await this.ensureAutoUpcoming(seed);
            if (!added) next = 0;
        }
        this.playSong(next);
    },

    async ensureAutoUpcoming(seed) {
        if (!seed || this.isAutoFillingQueue) return false;
        if (this.queue.some((_, idx) => idx > this.currentIndex)) return true;

        this.isAutoFillingQueue = true;
        showToast('Auto-building Up Next for your taste…', 1800);
        try {
            let more = [];
            if (window.Recommender) {
                more = await Recommender.generateAutoplayCandidates(seed, this.queue, 14);
            }

            if (!more.length) {
                more = await this.enrichQueueFromSeed(seed);
            }

            const unique = more.filter((song) => !this.queue.some((q) => isSimilarSong(q, song)));
            if (!unique.length) return false;

            this.queue.push(...unique);
            this.saveState();
            return true;
        } finally {
            this.isAutoFillingQueue = false;
        }
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
        
        const ring = document.querySelector('.player-art-ring');
        if (ring) ring.classList.toggle('active', isPlaying);

        // Sync NP overlay art & wrap
        const npArt = document.getElementById('npOverlayArt');
        if (npArt) npArt.classList.toggle('playing', isPlaying);
        const npVinyl = document.getElementById('npVinylDisc');
        if (npVinyl) npVinyl.classList.toggle('playing', isPlaying);
        const npWrap = document.getElementById('npArtWrap');
        if (npWrap) npWrap.classList.toggle('playing', isPlaying);

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
            if (window.Recommender && data.is_favorite) Recommender.learnFromSong(song, 'favorite');
            this.syncFavoriteUI(song.song_id);
            showToast(data.is_favorite ? '❤️ Added to favorites' : 'Removed from favorites');
            return data.is_favorite;
        }
        return this.isFavorite(song.song_id);
    },

    syncFavoriteUI(songId) {
        const isFav = this.isFavorite(songId);
        const setBtn = (id) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.classList.toggle('favorite-active', isFav);
            const icon = btn.querySelector('i');
            if (icon) icon.style.fill = isFav ? '#ef4444' : 'none';
        };
        setBtn('btnFavoritePlayer');
        setBtn('npBtnFav');
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

    removeFromQueueAt(idx) {
        if (idx < 0 || idx >= this.queue.length) return;
        this.queue.splice(idx, 1);
        if (idx < this.currentIndex) this.currentIndex -= 1;
        if (this.currentIndex >= this.queue.length) this.currentIndex = this.queue.length - 1;
        this.saveState();
    },

    moveToPlayNext(idx) {
        if (idx <= this.currentIndex || idx >= this.queue.length) return;
        const [song] = this.queue.splice(idx, 1);
        this.queue.splice(this.currentIndex + 1, 0, song);
        this.saveState();
    },

    async addSimilarAfter(idx, limit = 4) {
        const seed = this.queue[idx];
        if (!seed) return 0;
        const more = await this.enrichQueueFromSeed(seed, this.queue).then((items) => items.slice(0, limit));
        if (!more.length) return 0;
        this.queue.splice(idx + 1, 0, ...more);
        this.saveState();
        return more.length;
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
            const currentTime = Number(this.audio?.currentTime || 0);
            const payload = {
                queue: this.queue, currentIndex: this.currentIndex,
                currentTime,
                isShuffle: this.isShuffle, isRepeat: this.isRepeat
            };

            localStorage.setItem('sunosynth_v3_state', JSON.stringify(payload));

            const currentSong = this.getCurrentSong();
            if (currentSong?.song_id) {
                localStorage.setItem('sunosynth_v3_last_position', JSON.stringify({
                    song_id: currentSong.song_id,
                    currentTime,
                    updated_at: Date.now()
                }));
            }
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
                const safeTitle = decodeHTMLEntities(song.title || 'Unknown Title');
                const safeArtist = decodeHTMLEntities(song.artist || 'Unknown Artist');
                setText('playerTitle',  safeTitle);
                setText('playerArtist', safeArtist);
                setText('miniTitle',    safeTitle);
                setText('miniArtist',   safeArtist);
                if (song.image_url) {
                    setImg('playerImage', song.image_url);
                    setImg('miniArt',     song.image_url);
                }
                this.audio.src = song.download_url;
                let resumeAt = state.currentTime || 0;
                try {
                    const last = JSON.parse(localStorage.getItem('sunosynth_v3_last_position') || 'null');
                    if (last && last.song_id === song.song_id && Number(last.currentTime) > 0) {
                        resumeAt = Number(last.currentTime);
                    }
                } catch {}
                this.audio.addEventListener('canplay', () => {
                    if (!isNaN(this.audio.duration) && resumeAt > 0 && resumeAt < this.audio.duration) {
                        this.audio.currentTime = resumeAt;
                        // Trigger one time update to sync UI
                        this.audio.dispatchEvent(new Event('timeupdate'));
                    }
                }, { once: true });
                const mini = document.getElementById('miniPlayer');
                if (mini) mini.classList.add('visible');

                // Sync initial play state for animations
                this.updatePlayState(false);

                // Try resuming playback from where user left off.
                this.audio.play().catch(() => {});
                this.syncFavoriteUI(song.song_id);
                this._updatePlayerQueue();
            }
        } catch {}
    }
};
