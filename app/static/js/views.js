const Views = {

    /* ════════════ HOME ════════════ */
    async initHome() {
        // Seed popular row with trending artists
        const popularRow = document.getElementById('popularRow');
        if (popularRow) {
            popularRow.innerHTML = '';
            const seeds = ['Arijit Singh', 'AP Dhillon', 'Diljit Dosanjh'];
            const seed = seeds[Math.floor(Math.random() * seeds.length)];
            try {
                const data = await API.search(seed);
                if (data.ok && data.results) {
                    const songs = data.results.filter(r => r.type === 'song')
                        .map(s => normalizeSongData(s, true)).filter(s => s && s.download_url).slice(0, 8);
                    songs.forEach((s, i) => popularRow.appendChild(createBigCard(s, songs, i)));
                    lucide.createIcons();
                }
            } catch {}
        }

        // Category chip filter (UI only)
        const chipRow = document.getElementById('categoryChipRow');
        if (chipRow) {
            chipRow.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chipRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const cat = chip.dataset.cat;
                    if (cat !== 'all') quickSearch(cat + ' songs');
                });
            });
        }

        // Load personal home data
        const homeData = await API.getHomeData();
        const { history, favorites, most_played, recent_queries, feed, more_by_artist, reference_artist, recent_artists } = homeData;
        Player.favoriteSongIds = new Set(favorites.map(s => s.song_id));

        // Recently listened
        const historyRow = document.getElementById('historyRow');
        if (historyRow) {
            historyRow.innerHTML = '';
            history.slice(0, 10).forEach((s, i) => historyRow.appendChild(createRecentCard(s, history, i)));
            recent_queries.slice(0, 4).forEach(q => {
                const chip = document.createElement('button');
                chip.className = 'chip';
                chip.innerHTML = `<i data-lucide="search" style="width:13px;height:13px;"></i> ${q}`;
                chip.addEventListener('click', () => quickSearch(q));
                historyRow.appendChild(chip);
            });
        }
        setSectionVisibility('section-history', history.length > 0 || recent_queries.length > 0);

        // Artists
        const artistsRow = document.getElementById('recentArtistsRow');
        if (artistsRow) {
            artistsRow.innerHTML = '';
            recent_artists.forEach(a => {
                const b = document.createElement('div');
                b.className = 'artist-bubble';
                b.innerHTML = `<img class="artist-avatar" src="${a.image_url||''}" alt="${a.name}" onerror="this.style.background='var(--bg-input)';this.removeAttribute('src')"><span class="artist-bubble-name">${a.name}</span>`;
                b.addEventListener('click', () => quickSearch(a.name));
                artistsRow.appendChild(b);
            });
        }
        setSectionVisibility('section-artists', recent_artists.length > 0);

        // Favorites
        const favRow = document.getElementById('favRow');
        if (favRow) {
            favRow.innerHTML = '';
            favorites.slice(0, 8).forEach((s, i) => favRow.appendChild(createSongPill(s, favorites, i)));
        }
        setSectionVisibility('section-fav', favorites.length > 0);

        // Most played
        const mpList = document.getElementById('mostPlayedList');
        if (mpList && most_played.length) renderRankedList(most_played.slice(0, 6), mpList);
        setSectionVisibility('section-most-played', most_played.length > 0);

        // Playlists
        const plStrip = document.getElementById('homePlaylistStrip');
        if (plStrip) {
            plStrip.innerHTML = '';
            const pd = await API.getPlaylists();
            pd.playlists.slice(0, 4).forEach(p => {
                const row = document.createElement('div');
                row.className = 'playlist-row';
                row.style.marginBottom = '8px';
                row.innerHTML = `<div class="playlist-row-cover"><i data-lucide="music-4"></i></div><div class="playlist-row-info"><h4>${p.name}</h4><p>${p.song_count} songs</p></div><i data-lucide="chevron-right" style="color:var(--text-muted);width:16px;height:16px;margin-left:auto;"></i>`;
                row.addEventListener('click', () => navigateTo(`playlist-${p.id}`));
                plStrip.appendChild(row);
            });
            setSectionVisibility('section-playlists', pd.playlists.length > 0);
        }

        // More by Artist
        const mbyRow = document.getElementById('moreByArtistRow');
        const mbyTitle = document.getElementById('moreByTitle');
        if (mbyRow && more_by_artist.length) {
            mbyRow.innerHTML = '';
            if (mbyTitle) mbyTitle.textContent = `More by ${reference_artist || more_by_artist[0].artist.split(',')[0]}`;
            more_by_artist.slice(0, 8).forEach((s, i) => mbyRow.appendChild(createSongPill(s, more_by_artist, i)));
        }
        setSectionVisibility('section-more-by', more_by_artist.length > 0);

        // Feed
        const feedGrid = document.getElementById('homeFeedGrid');
        const feedEmpty = document.getElementById('homeFeedEmpty');
        if (feed.length === 0) {
            if (feedEmpty) feedEmpty.style.display = '';
        } else {
            if (feedEmpty) feedEmpty.style.display = 'none';
            if (feedGrid) renderSongGrid(feed.slice(0, 12), feedGrid);
        }

        lucide.createIcons();
    },

    /* ════════════ SEARCH ════════════ */
    initSearch() {
        const input    = document.getElementById('searchInput');
        const grid     = document.getElementById('resultsGrid');
        const loader   = document.getElementById('loadingSpinner');
        const errorEl  = document.getElementById('errorMessage');
        const trending = document.getElementById('trendingSection');
        const results  = document.getElementById('searchResultsSection');
        const countLbl = document.getElementById('resultsCountLabel');
        const clearBtn = document.getElementById('searchClear');
        const langFilter = document.getElementById('langFilter');
        const trendingGrid = document.getElementById('trendingGrid');

        if (!input) return;

        // Build trending grid
        const trendingTerms = ['Arijit Singh','AP Dhillon','Shreya Ghoshal','Diljit Dosanjh','Kishore Kumar','Lata Mangeshkar','Taylor Swift','The Weeknd'];
        if (trendingGrid) {
            trendingGrid.innerHTML = '';
            trendingTerms.forEach(q => {
                const c = document.createElement('button');
                c.className = 'trending-chip';
                c.innerHTML = `<i data-lucide="trending-up"></i><span>${q}</span>`;
                c.addEventListener('click', () => { input.value = q; input.dispatchEvent(new Event('input')); });
                trendingGrid.appendChild(c);
            });
            lucide.createIcons();
        }

        let allResults = [], activeFilter = 'all', timer;

        const applyFilter = () => {
            grid.innerHTML = '';
            const filtered = activeFilter === 'all' ? allResults : allResults.filter(s => (s.language||'').toLowerCase() === activeFilter);
            if (!filtered.length) { errorEl.style.display = ''; return; }
            errorEl.style.display = 'none';
            renderSongGrid(filtered, grid);
        };

        if (langFilter) langFilter.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
            langFilter.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active'); activeFilter = c.dataset.lang; applyFilter();
        }));

        if (clearBtn) clearBtn.addEventListener('click', () => {
            input.value = ''; allResults = []; grid.innerHTML = '';
            trending.style.display = ''; results.style.display = 'none';
            errorEl.style.display = 'none'; langFilter && (langFilter.style.display = 'none');
        });

        input.addEventListener('input', e => {
            clearTimeout(timer);
            const q = e.target.value.trim();
            if (q.length < 2) {
                trending.style.display = ''; results.style.display = 'none';
                errorEl.style.display = 'none'; loader.style.display = 'none'; return;
            }
            trending.style.display = 'none'; loader.style.display = 'flex';
            results.style.display = 'none'; errorEl.style.display = 'none';

            timer = setTimeout(async () => {
                const data = await API.search(q);
                loader.style.display = 'none';
                if (!data.ok || !data.results?.length) { errorEl.style.display = ''; return; }

                allResults = data.results.filter(r => r.type === 'song').map(s => normalizeSongData(s, true)).filter(s => s && s.download_url);
                if (!allResults.length) { errorEl.style.display = ''; return; }

                results.style.display = '';
                if (countLbl) countLbl.innerHTML = `<span>${allResults.length}</span> results for "${q}"`;
                if (langFilter) { langFilter.style.display = 'flex'; langFilter.querySelectorAll('.chip').forEach((c,i) => c.classList.toggle('active', i===0)); }
                activeFilter = 'all'; applyFilter();
                API.persistSearchFeed(q, data.results.filter(r => r.type === 'song'));
            }, 420);
        });
        input.focus();
    },

    /* ════════════ LIBRARY ════════════ */
    async initLibrary() {
        const grid     = document.getElementById('playlistsGrid');
        const loader   = document.getElementById('librarySpinner');
        const emptyEl  = document.getElementById('libraryEmpty');
        const btnCreate= document.getElementById('btnCreatePlaylist');
        const btnCrEmp = document.getElementById('btnCreatePlaylistEmpty');
        const modal    = document.getElementById('createPlaylistModal');

        if (!grid) return;
        loader.style.display = 'flex';
        const data = await API.getPlaylists();
        loader.style.display = 'none';

        const totalSongs = data.playlists.reduce((a,p) => a + (p.song_count||0), 0);
        const el = id => document.getElementById(id);
        if (el('statPlaylists')) el('statPlaylists').textContent = data.playlists.length;
        if (el('statSongs'))     el('statSongs').textContent = totalSongs;

        const hd = await API.getHomeData();
        if (el('statFavorites')) el('statFavorites').textContent = hd.favorites?.length || 0;

        if (!data.playlists.length) {
            if (emptyEl) emptyEl.style.display = '';
        } else {
            if (emptyEl) emptyEl.style.display = 'none';
            data.playlists.forEach(p => {
                const row = document.createElement('div');
                row.className = 'playlist-row';
                row.innerHTML = `<div class="playlist-row-cover"><i data-lucide="music-4"></i></div><div class="playlist-row-info"><h4>${p.name}</h4><p>${p.song_count} songs</p></div><i data-lucide="chevron-right" style="color:var(--text-muted);width:16px;height:16px;margin-left:auto;"></i>`;
                row.addEventListener('click', () => navigateTo(`playlist-${p.id}`));
                grid.appendChild(row);
            });
        }
        lucide.createIcons();

        const openModal  = () => modal.classList.add('show');
        const closeModal = () => { modal.classList.remove('show'); document.getElementById('newPlaylistName').value = ''; };
        if (btnCreate) btnCreate.addEventListener('click', openModal);
        if (btnCrEmp) btnCrEmp.addEventListener('click', openModal);
        document.getElementById('btnCancelCreate').addEventListener('click', closeModal);
        document.getElementById('btnSavePlaylist').addEventListener('click', async () => {
            const name = document.getElementById('newPlaylistName').value.trim();
            if (!name) return;
            await API.createPlaylist(name); closeModal();
            showToast('Playlist created! 🎵'); navigateTo('library');
        });
    },

    /* ════════════ FAVORITES ════════════ */
    async initFavorites() {
        const grid  = document.getElementById('favoritesGrid');
        const empty = document.getElementById('favoritesEmpty');
        const spinner = document.getElementById('favoritesSpinner');
        if (!grid) return;
        if (spinner) spinner.style.display = 'flex';
        const hd = await API.getHomeData();
        if (spinner) spinner.style.display = 'none';
        const favs = hd.favorites || [];
        Player.favoriteSongIds = new Set(favs.map(s => s.song_id));
        if (!favs.length) { if (empty) empty.style.display = ''; return; }
        renderSongGrid(favs, grid);
    },

    /* ════════════ PLAYLIST DETAIL ════════════ */
    async initPlaylistDetail(id) {
        const data = await API.getPlaylistSongs(id);
        const el = x => document.getElementById(x);
        if (el('detailPlaylistName')) el('detailPlaylistName').textContent = data.playlist.name;
        if (el('detailPlaylistMeta')) el('detailPlaylistMeta').textContent = `${data.songs.length} songs · ${new Date(data.playlist.created_at).toLocaleDateString()}`;

        el('btnPlayPlaylist')?.addEventListener('click', () => {
            if (!data.songs.length) return showToast('No songs in this playlist');
            Player.setQueue(data.songs); Player.playSong(0);
        });
        el('btnDeletePlaylist')?.addEventListener('click', async () => {
            if (!confirm('Delete this playlist?')) return;
            await API.deletePlaylist(id); showToast('Playlist deleted'); navigateTo('library');
        });

        const list = el('playlistSongsList');
        const tmpl = el('playlistSongTemplate');
        const emptyEl = el('playlistEmpty');
        if (!data.songs.length) { if (emptyEl) emptyEl.style.display = ''; return; }

        data.songs.forEach((song, idx) => {
            const clone = tmpl.content.cloneNode(true);
            clone.querySelector('.tr-index').textContent = idx + 1;
            clone.querySelector('.item-img').src = song.image_url || '';
            clone.querySelector('.item-title').textContent = song.title;
            clone.querySelector('.item-artist').textContent = song.artist;
            const row = clone.querySelector('.song-table-row');
            row.addEventListener('click', e => { if (e.target.closest('.remove-song-btn')) return; Player.setQueue(data.songs); Player.playSong(idx); });
            clone.querySelector('.remove-song-btn').addEventListener('click', async () => { await API.removeSongFromPlaylist(id, song.id); row.remove(); showToast('Song removed'); });
            list.appendChild(clone);
        });
        lucide.createIcons();
    },

    /* ════════════ NOW PLAYING (desktop page) ════════════ */
    initNowPlaying() {
        const el = x => document.getElementById(x);
        const song = Player.currentIndex >= 0 ? Player.queue[Player.currentIndex] : null;

        const artImg  = el('npArtImg');
        const titleEl  = el('npTitle');
        const artistEl = el('npArtist');
        const albumEl  = el('npAlbum');

        if (!song) {
            if (titleEl)  titleEl.textContent  = 'No track playing';
            if (artistEl) artistEl.textContent = 'Play a song from Search or Library';
            return;
        }

        // Populate art + meta
        if (artImg) artImg.src = song.image_url || '';
        if (titleEl)  titleEl.textContent  = song.title;
        if (artistEl) artistEl.textContent = song.artist || '';
        if (albumEl)  albumEl.textContent  = song.album_name || '';

        // Dynamic background tint from album art
        if (song.image_url) {
            const dynBg = document.getElementById('dynamicBg');
            if (dynBg) dynBg.style.backgroundImage = `url('${song.image_url}')`;
        }

        // Fav button
        const favBtn = el('npBtnFav');
        if (favBtn) {
            const updateFav = () => {
                const isFav = Player.isFavorite(song.song_id);
                favBtn.style.color = isFav ? 'var(--accent)' : '';
                const icon = favBtn.querySelector('i');
                if (icon) icon.style.fill = isFav ? 'var(--accent)' : 'none';
            };
            updateFav();
            favBtn.addEventListener('click', async () => { await Player.toggleFavorite(song); updateFav(); });
        }

        // Add to playlist
        el('npBtnAddPlaylist')?.addEventListener('click', () => UI_openAddToPlaylist(song));
        el('npBtnShare')?.addEventListener('click', () => { navigator.share?.({ title: song.title, text: song.artist }); });

        // Artist click → search
        if (artistEl) artistEl.addEventListener('click', () => quickSearch(song.artist));

        // Desktop controls — progress bar sync
        const desktopFill = el('npDesktopFill');
        const desktopCur  = el('npDesktopCur');
        const desktopTot  = el('npDesktopTot');
        const onTimeUpdate = () => {
            if (!Player.audio.duration) return;
            const pct = (Player.audio.currentTime / Player.audio.duration) * 100;
            if (desktopFill) desktopFill.style.width = `${pct}%`;
            if (desktopCur)  desktopCur.textContent  = formatTime(Player.audio.currentTime);
            if (desktopTot)  desktopTot.textContent  = formatTime(Player.audio.duration);
        };
        Player.audio.addEventListener('timeupdate', onTimeUpdate);
        onTimeUpdate();

        // Desktop progress click
        el('npDesktopBar')?.addEventListener('click', e => {
            if (!Player.audio.duration) return;
            const r = el('npDesktopBar').getBoundingClientRect();
            Player.audio.currentTime = ((e.clientX - r.left) / r.width) * Player.audio.duration;
        });

        // Desktop control buttons
        const B = (id, fn) => el(id)?.addEventListener('click', fn);
        B('npDeskPlay',    () => Player.togglePlay());
        B('npDeskPrev',    () => Player.playPrev());
        B('npDeskNext',    () => Player.playNext());
        B('npDeskShuffle', () => {
            Player.isShuffle = !Player.isShuffle;
            el('npDeskShuffle')?.classList.toggle('active', Player.isShuffle);
            el('btnShuffle')?.classList.toggle('active', Player.isShuffle);
        });
        B('npDeskRepeat', () => {
            Player.isRepeat = !Player.isRepeat;
            el('npDeskRepeat')?.classList.toggle('active', Player.isRepeat);
            el('btnRepeat')?.classList.toggle('active', Player.isRepeat);
        });

        // Sync play icon
        const syncPlayIcon = () => {
            const btn = el('npDeskPlay');
            if (btn) btn.innerHTML = `<i data-lucide="${Player.audio.paused ? 'play' : 'pause'}"></i>`;
            lucide.createIcons();
        };
        syncPlayIcon();
        Player.audio.addEventListener('play',  syncPlayIcon);
        Player.audio.addEventListener('pause', syncPlayIcon);

        // Queue list
        const queue = el('npQueue');
        if (queue) {
            queue.innerHTML = '';
            const upcoming = Player.queue
                .map((s, i) => ({ s, i }))
                .filter(e => e.i > Player.currentIndex)
                .slice(0, 10);

            if (!upcoming.length) {
                queue.innerHTML = '<p class="text-muted text-sm">No upcoming songs in queue.</p>';
            } else {
                upcoming.forEach(({ s, i }) => {
                    const row = document.createElement('div');
                    row.className = 'song-row';
                    row.innerHTML = `
                        <span class="row-index">${i}</span>
                        <img class="row-thumb" src="${s.image_url || ''}" alt="">
                        <div class="row-info">
                            <div class="row-title">${s.title}</div>
                            <div class="row-artist">${s.artist || ''}</div>
                        </div>
                        <div class="row-actions">
                            <button class="btn-icon rm-q" title="Remove"><i data-lucide="x"></i></button>
                        </div>
                    `;
                    row.addEventListener('click', e => { if (e.target.closest('.rm-q')) return; Player.playSong(i); });
                    row.querySelector('.rm-q').addEventListener('click', e => {
                        e.stopPropagation();
                        Player.queue.splice(i, 1);
                        if (i < Player.currentIndex) Player.currentIndex--;
                        Views.initNowPlaying();
                    });
                    queue.appendChild(row);
                });
            }
        }
        lucide.createIcons();
    },


    /* ════════════ ALBUM ════════════ */
    async initAlbum(albumId) {
        const el = x => document.getElementById(x);
        el('albumSpinner') && (el('albumSpinner').style.display = 'flex');
        const data = await API.getAlbum(albumId);
        el('albumSpinner') && (el('albumSpinner').style.display = 'none');
        if (!data.ok) { showToast('Failed to load album'); return; }

        const img = data.image?.find(i => i.quality === '500x500');
        if (el('albumCover')) el('albumCover').src = img?.url || '';
        if (el('albumTitle')) el('albumTitle').textContent = data.name;
        if (el('albumMeta'))  el('albumMeta').textContent = `${data.year||''} · ${data.language||''} · ${data.artists?.primary?.[0]?.name||''}`;
        const dynBg = el('dynamicBg');
        if (dynBg && img) dynBg.style.backgroundImage = `url('${img.url}')`;

        const songs = (data.songs||[]).map(s => normalizeSongData(s,true)).filter(s => s && s.download_url);
        el('btnPlayAlbum')?.addEventListener('click', () => { if (!songs.length) return; Player.setQueue(songs); Player.playSong(0); });
        el('btnShuffleAlbum')?.addEventListener('click', () => { if (!songs.length) return; Player.setQueue([...songs].sort(()=>Math.random()-0.5)); Player.playSong(0); });

        const table = el('albumSongTable'), list = el('albumSongsList');
        if (table) table.style.display = '';
        songs.forEach((song, idx) => {
            const row = document.createElement('div');
            row.className = 'song-table-row';
            row.innerHTML = `<span class="tr-index">${idx+1}</span><div class="tr-song"><img class="item-img" src="${song.image_url||''}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"><div><div class="item-title">${song.title}</div><div class="item-artist">${song.artist||''}</div></div></div><div class="tr-actions"><button class="btn-icon add-pl-btn"><i data-lucide="plus-circle"></i></button></div>`;
            row.addEventListener('click', e => { if (e.target.closest('.add-pl-btn')) return; Player.setQueue(songs); Player.playSong(idx); });
            row.querySelector('.add-pl-btn').addEventListener('click', e => { e.stopPropagation(); UI_openAddToPlaylist(song); });
            list && list.appendChild(row);
        });
        lucide.createIcons();
    },

    /* ════════════ ARTIST ════════════ */
    async initArtist(artistId) {
        const el = x => document.getElementById(x);
        el('artistSpinner') && (el('artistSpinner').style.display = 'flex');
        const data = await API.getArtist(artistId);
        el('artistSpinner') && (el('artistSpinner').style.display = 'none');
        if (!data.ok) { showToast('Failed to load artist'); return; }

        const img = data.image?.find(i => i.quality === '500x500');
        if (el('artistBg') && img) el('artistBg').src = img.url;
        if (el('artistName')) el('artistName').textContent = data.name;
        if (el('artistMeta')) el('artistMeta').textContent = `${(data.followerCount||0).toLocaleString()} followers`;
        const dynBg = el('dynamicBg');
        if (dynBg && img) dynBg.style.backgroundImage = `url('${img.url}')`;

        const songs = (data.topSongs||[]).map(s => normalizeSongData(s,true)).filter(s => s && s.download_url).slice(0,12);
        el('btnPlayArtist')?.addEventListener('click', () => { if (!songs.length) return; Player.setQueue(songs); Player.playSong(0); });
        el('btnSearchArtist')?.addEventListener('click', () => quickSearch(data.name));

        const tracksEl = el('artistTopTracks');
        if (tracksEl) songs.forEach((s, i) => tracksEl.appendChild(createRankedRow(s, songs, i)));
        el('artistContent') && (el('artistContent').style.display = '');
        lucide.createIcons();
    }
};
