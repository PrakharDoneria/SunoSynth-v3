/* ── Utils ── */

function formatTime(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function decodeHTMLEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

function formatPlayCount(count) {
    if (!count) return '';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toString();
}

function isSimilarSong(a, b) {
    if (!a || !b) return false;
    if (a.song_id && b.song_id && a.song_id === b.song_id) return true;
    const titleA = (a.title || '').toLowerCase().trim();
    const titleB = (b.title || '').toLowerCase().trim();
    const artistA = (a.artist || a.artist_name || '').toLowerCase().trim();
    const artistB = (b.artist || b.artist_name || '').toLowerCase().trim();
    return titleA === titleB && artistA === artistB;
}

function navigateTo(route) {
    if (typeof Router !== 'undefined') Router.navigateTo(route);
}

function quickSearch(query) {
    navigateTo('search');
    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = query;
            input.dispatchEvent(new Event('input'));
        }
    }, 350);
}

window.navigateTo = navigateTo;
window.quickSearch = quickSearch;
