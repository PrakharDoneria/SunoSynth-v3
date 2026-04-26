const API = {
    async getHomeData() {
        try {
            const res = await fetch('/api/activity/home-data');
            return await res.json();
        } catch (err) {
            console.error('Home data fetch failed', err);
            return { history: [], favorites: [], most_played: [], recent_queries: [], feed: [], more_by_artist: [], reference_artist: '', recent_artists: [] };
        }
    },

    async search(query) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        return await res.json();
    },

    async getPlaylists() {
        const res = await fetch('/api/playlists');
        return await res.json();
    },

    async getPlaylistSongs(id) {
        const res = await fetch(`/api/playlists/${id}/songs`);
        return await res.json();
    },

    async createPlaylist(name) {
        return await fetch('/api/playlists', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name})
        });
    },

    async deletePlaylist(id) {
        return await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    },

    async addSongToPlaylist(playlistId, song) {
        return await fetch(`/api/playlists/${playlistId}/songs`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(song)
        });
    },

    async removeSongFromPlaylist(playlistId, songId) {
        return await fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
    },

    async toggleFavorite(song) {
        const res = await fetch('/api/activity/favorite', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(song)
        });
        return await res.json();
    },

    async trackPlay(song) {
        return fetch('/api/activity/play', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(song)
        });
    },

    async persistSearchFeed(query, songs) {
        const normalizedSongs = songs
            .slice(0, 10)
            .map((song) => normalizeSongData(song, true))
            .filter((song) => song && song.download_url);

        return fetch('/api/activity/search', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ query: query.trim(), songs: normalizedSongs })
        });
    },

    async getAlbum(id) {
        const res = await fetch(`/api/album?id=${encodeURIComponent(id)}`);
        return await res.json();
    },

    async getArtist(id) {
        const res = await fetch(`/api/artist?id=${encodeURIComponent(id)}`);
        return await res.json();
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
