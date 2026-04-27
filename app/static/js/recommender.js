const Recommender = {
    STORAGE_KEY: 'ss_local_recommender_v1',
    state: null,

    init() {
        this._load();
        this.learnFromOnboarding();
    },

    _defaultState() {
        return {
            artistAffinity: {},
            queryAffinity: {},
            recentSongIds: []
        };
    },

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            this.state = raw ? JSON.parse(raw) : this._defaultState();
        } catch {
            this.state = this._defaultState();
        }
    },

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state || this._defaultState()));
        } catch {}
    },

    _ensureState() {
        if (!this.state) this._load();
    },

    _inc(map, key, delta) {
        if (!key) return;
        map[key] = (map[key] || 0) + delta;
        if (map[key] < 0) map[key] = 0;
        if (map[key] > 200) map[key] = 200;
    },

    _topKeys(map, limit = 3) {
        return Object.entries(map || {})
            .sort((a, b) => (b[1] || 0) - (a[1] || 0))
            .slice(0, limit)
            .map(([k]) => k);
    },

    _extractArtists(song) {
        const artistText = (song?.artist || song?.artist_name || '').trim();
        if (!artistText) return [];
        return artistText.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean).slice(0, 3);
    },

    _rememberSong(songId) {
        if (!songId) return;
        const ids = this.state.recentSongIds || [];
        const next = [songId, ...ids.filter((x) => x !== songId)].slice(0, 40);
        this.state.recentSongIds = next;
    },

    learnFromSong(song, reason = 'play') {
        if (!song) return;
        this._ensureState();
        const weight = reason === 'favorite' ? 5 : reason === 'skip' ? -1 : 2;
        this._extractArtists(song).forEach((artist) => this._inc(this.state.artistAffinity, artist, weight));
        this._rememberSong(song.song_id);
        this._save();
    },

    learnFromSearch(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return;
        this._ensureState();
        this._inc(this.state.queryAffinity, q, 3);
        q.split(/\s+/)
            .filter((token) => token.length >= 4)
            .slice(0, 3)
            .forEach((token) => this._inc(this.state.queryAffinity, token, 1));
        this._save();
    },

    learnFromOnboarding() {
        const onboarding = StorageManager.getOnboardingState?.();
        if (!onboarding || !onboarding.completed) return;
        this._ensureState();
        (onboarding.selected_artists || []).forEach((artist) => {
            this._inc(this.state.artistAffinity, (artist || '').toLowerCase(), 4);
        });
        (onboarding.favorite_queries || []).forEach((query) => {
            this._inc(this.state.queryAffinity, (query || '').toLowerCase(), 3);
        });
        this._save();
    },

    learnFromHomeData(homeData) {
        if (!homeData) return;
        this._ensureState();
        (homeData.favorites || []).slice(0, 12).forEach((song) => this.learnFromSong(song, 'favorite'));
        (homeData.most_played || []).slice(0, 12).forEach((song) => this.learnFromSong(song, 'play'));
        (homeData.recent_queries || []).slice(0, 8).forEach((query) => this.learnFromSearch(query));
        this._save();
    },

    scoreSong(song) {
        this._ensureState();
        if (!song) return 0;

        let score = 0;
        const artistText = (song.artist || song.artist_name || '').toLowerCase();
        const titleText = (song.title || '').toLowerCase();

        Object.entries(this.state.artistAffinity || {}).forEach(([artist, weight]) => {
            if (artistText.includes(artist)) score += (weight || 0) * 1.8;
        });

        Object.entries(this.state.queryAffinity || {}).forEach(([term, weight]) => {
            if (titleText.includes(term) || artistText.includes(term)) score += (weight || 0) * 1.2;
        });

        if ((this.state.recentSongIds || []).includes(song.song_id)) score -= 8;
        return score;
    },

    personalizeFeed(feed, homeData) {
        const base = Array.isArray(feed) ? feed : [];
        this.learnFromHomeData(homeData);

        const unique = [];
        base.forEach((song) => {
            if (!song?.song_id) return;
            if (unique.some((x) => x.song_id === song.song_id)) return;
            unique.push(song);
        });

        return unique
            .map((song, idx) => ({ song, idx, score: this.scoreSong(song) }))
            .sort((a, b) => (b.score - a.score) || (a.idx - b.idx))
            .map((x) => x.song);
    },

    _intentTerms(seedSong) {
        this._ensureState();
        const terms = [];
        const addTerm = (term) => {
            const t = (term || '').trim();
            if (!t) return;
            if (terms.some((existing) => existing.toLowerCase() === t.toLowerCase())) return;
            terms.push(t);
        };

        addTerm((seedSong?.artist || '').split(',')[0]);
        addTerm(seedSong?.title);

        this._topKeys(this.state.artistAffinity, 3).forEach((artist) => addTerm(artist));
        this._topKeys(this.state.queryAffinity, 3).forEach((query) => addTerm(query));

        const onboarding = StorageManager.getOnboardingState?.();
        if (onboarding?.completed) {
            (onboarding.selected_artists || []).slice(0, 2).forEach(addTerm);
            (onboarding.favorite_queries || []).slice(0, 2).forEach(addTerm);
        }

        if (!terms.length) {
            ['Arijit Singh', 'Shreya Ghoshal', 'AP Dhillon', 'Hindi Hits'].forEach(addTerm);
        }

        return terms.slice(0, 6);
    },

    async generateAutoplayCandidates(seedSong, existingQueue = [], limit = 10) {
        const terms = this._intentTerms(seedSong);
        const pool = [];
        const isSeen = (song) => {
            return pool.some((x) => isSimilarSong(x, song)) ||
                existingQueue.some((x) => isSimilarSong(x, song));
        };

        for (const term of terms) {
            const data = await API.search(term);
            if (!data?.ok || !data.results?.length) continue;

            const songs = data.results
                .filter((item) => item.type === 'song')
                .map((item) => normalizeSongData(item, true))
                .filter((song) => song && song.download_url);

            songs.forEach((song) => {
                if (!isSeen(song)) pool.push(song);
            });

            if (pool.length >= limit * 2) break;
        }

        return pool
            .map((song) => ({ song, score: this.scoreSong(song) }))
            .sort((a, b) => b.score - a.score)
            .map((x) => x.song)
            .slice(0, limit);
    }
};

window.Recommender = Recommender;
