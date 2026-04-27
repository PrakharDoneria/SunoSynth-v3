const API = {
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-User-ID': StorageManager.getUserId() || 'guest'
        };
    },

    async getHomeData() {
        try {
            const res = await fetch('/api/activity/home-data', { headers: this.getHeaders() });
            if (!res.ok) throw new Error('Server unreachable');
            const data = await res.json();
            // Cache successful response
            await StorageManager.cacheData('home_data', data);
            return data;
        } catch (err) {
            console.error('Home data fetch failed, using local cache', err);
            const cached = await StorageManager.getCachedData('home_data');
            return cached || {
                history: [],
                favorites: [],
                most_played: [],
                recent_queries: [],
                feed: [],
                more_by_artist: [],
                reference_artist: '',
                recent_artists: []
            };
        }
    },

    async getOnboardingSuggestions() {
        try {
            const res = await fetch('/api/onboarding/suggestions', { headers: this.getHeaders() });
            return await res.json();
        } catch (err) {
            console.error('Onboarding status fetch failed', err);
            return {
                suggested_artists: [],
            };
        }
    },

    async seedOnboardingFeed(payload) {
        try {
            const res = await fetch('/api/onboarding/seed', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
            });
            return await res.json();
        } catch (err) {
            console.error('Onboarding completion failed', err);
            return { ok: false, message: 'Network error' };
        }
    },

    async search(query) {
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers: this.getHeaders() });
            return await res.json();
        } catch (err) {
            console.error('Search failed', err);
            return { ok: false, message: 'Network error', results: [] };
        }
    },

    async getPlaylists() {
        try {
            const res = await fetch('/api/playlists', { headers: this.getHeaders() });
            if (!res.ok) throw new Error('Server unreachable');
            const data = await res.json();
            await StorageManager.cacheData('playlists', data);
            return data;
        } catch (err) {
            console.warn('Using cached playlists', err);
            const cached = await StorageManager.getCachedData('playlists');
            return cached || { playlists: [] };
        }
    },

    async getPlaylistSongs(id) {
        try {
            const res = await fetch(`/api/playlists/${id}/songs`, { headers: this.getHeaders() });
            if (!res.ok) throw new Error('Server unreachable');
            const data = await res.json();
            await StorageManager.cacheData(`playlist_${id}`, data);
            return data;
        } catch (err) {
            console.warn(`Using cached songs for playlist ${id}`, err);
            const cached = await StorageManager.getCachedData(`playlist_${id}`);
            return cached || { playlist: { name: 'Offline Playlist' }, songs: [] };
        }
    },

    async createPlaylist(name) {
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({name})
        });
        const data = await res.json();
        // Refresh cache on update
        this.getPlaylists();
        return data;
    },

    async deletePlaylist(id) {
        const res = await fetch(`/api/playlists/${id}`, { 
            method: 'DELETE',
            headers: this.getHeaders()
        });
        this.getPlaylists();
        return res;
    },

    async addSongToPlaylist(playlistId, song) {
        const res = await fetch(`/api/playlists/${playlistId}/songs`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(song)
        });
        this.getPlaylistSongs(playlistId);
        return res;
    },

    async removeSongFromPlaylist(playlistId, songId) {
        const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, { 
            method: 'DELETE',
            headers: this.getHeaders()
        });
        this.getPlaylistSongs(playlistId);
        return res;
    },

    async toggleFavorite(song) {
        try {
            const res = await fetch('/api/activity/favorite', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(song)
            });
            const data = await res.json();
            // Optimistically update home cache if possible or just invalidate
            this.getHomeData(); 
            return data;
        } catch (err) {
            console.error('Toggle favorite failed', err);
            return { ok: false };
        }
    },

    async trackPlay(song) {
        try {
            return fetch('/api/activity/play', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(song)
            });
        } catch (err) {
            console.error('Track play failed', err);
        }
    },

    async persistSearchFeed(query, songs) {
        try {
            const normalizedSongs = songs
                .slice(0, 10)
                .map((song) => normalizeSongData(song, true))
                .filter((song) => song && song.download_url);

            return fetch('/api/activity/search', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ query: query.trim(), songs: normalizedSongs })
            });
        } catch (err) {
            console.error('Persist search failed', err);
        }
    },

    async getAlbum(id) {
        const res = await fetch(`/api/album?id=${encodeURIComponent(id)}`, { headers: this.getHeaders() });
        return await res.json();
    },

    async getArtist(id) {
        const res = await fetch(`/api/artist?id=${encodeURIComponent(id)}`, { headers: this.getHeaders() });
        return await res.json();
    },

    async ping() {
        try {
            const res = await fetch('/api/ping', { 
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(5000) 
            });
            return res.ok;
        } catch (err) {
            return false;
        }
    }
};

function normalizeSongData(song, isSearch) {
    if(!isSearch) return song; 
    
    let artistNames = "-";
    if (song.artists && song.artists.primary && song.artists.primary.length > 0) {
        artistNames = song.artists.primary.map(a => a.name).join(', ');
    }
    
    const imageObj = (song.image && (song.image.find(img => img.quality === '500x500') || song.image[song.image.length - 1])) || null;
    
    let audioUrl = "";
    if (song.downloadUrl && song.downloadUrl.length > 0) {
        const sortedUrls = [...song.downloadUrl].sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
        audioUrl = sortedUrls[0].url;
    }

    return {
        song_id: song.id,
        title: decodeHTMLEntities(song.name),
        artist: decodeHTMLEntities(artistNames),
        image_url: imageObj ? imageObj.url : '',
        download_url: audioUrl,
        album_id: song.album?.id || song.albumId || '',
        album_name: decodeHTMLEntities(song.album?.name || song.albumName || ''),
        artist_ids: (song.artists?.primary || []).map((a) => a.id).filter(Boolean),
        artist_name: decodeHTMLEntities(artistNames)
    };
}
