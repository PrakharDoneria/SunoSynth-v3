from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, abort
from app.services import search_jiosaavn, get_album_details, get_artist_details
from app.models import (
    db,
    Playlist,
    PlaylistSong,
    UserSongActivity,
    UserRecentPlay,
    UserSearchQuery,
    UserFeedSong,
)

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/home')
@main.route('/search')
@main.route('/library')
@main.route('/now-playing')
@main.route('/now/playing')
@main.route('/playlist/<int:playlist_id>')
@main.route('/favorites')
@main.route('/album/<album_id>')
@main.route('/artist/<artist_id>')
def spa_entry(**kwargs):
    return render_template('index.html')

# View partials for SPA
@main.route('/partial/<view>')
def render_partial(view):
    if view in ['home', 'search', 'library', 'favorites', 'playlist', 'now_playing', 'album', 'artist']:
        return render_template(f'partials/{view}.html')
    abort(404)

# --- External API Proxy ---

@main.route('/api/search')
def api_search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({"ok": False, "message": "Query parameter is required", "results": []}), 400
    
    data = search_jiosaavn(query)
    return jsonify(data)

@main.route('/api/album')
def api_album():
    album_id = request.args.get('id', '')
    if not album_id:
        return jsonify({"ok": False, "message": "Album ID is required"}), 400
        
    data = get_album_details(album_id)
    return jsonify(data)


@main.route('/api/artist')
def api_artist():
    artist_id = request.args.get('id', '')
    if not artist_id:
        return jsonify({"ok": False, "message": "Artist ID is required"}), 400

    data = get_artist_details(artist_id)
    return jsonify(data)

# --- Local Playlist API ---

@main.route('/api/playlists', methods=['GET'])
def get_playlists():
    playlists = Playlist.query.order_by(Playlist.created_at.desc()).all()
    return jsonify({"playlists": [p.to_dict() for p in playlists]})

@main.route('/api/playlists', methods=['POST'])
def create_playlist():
    data = request.get_json()
    name = data.get('name', 'New Playlist')
    playlist = Playlist(name=name)
    db.session.add(playlist)
    db.session.commit()
    return jsonify(playlist.to_dict()), 201

@main.route('/api/playlists/<int:playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    playlist = Playlist.query.get_or_404(playlist_id)
    db.session.delete(playlist)
    db.session.commit()
    return jsonify({"success": True}), 200

@main.route('/api/playlists/<int:playlist_id>/songs', methods=['GET'])
def get_playlist_songs(playlist_id):
    playlist = Playlist.query.get_or_404(playlist_id)
    songs = [s.to_dict() for s in playlist.songs]
    return jsonify({"playlist": playlist.to_dict(), "songs": songs})

@main.route('/api/playlists/<int:playlist_id>/songs', methods=['POST'])
def add_song_to_playlist(playlist_id):
    playlist = Playlist.query.get_or_404(playlist_id)
    data = request.get_json()
    
    # Check if song already exists in playlist
    existing = PlaylistSong.query.filter_by(playlist_id=playlist.id, song_id=data['song_id']).first()
    if existing:
        return jsonify({"message": "Song already in playlist"}), 400

    new_song = PlaylistSong(
        playlist_id=playlist.id,
        song_id=data['song_id'],
        title=data.get('title', 'Unknown Title'),
        artist=data.get('artist', 'Unknown Artist'),
        image_url=data.get('image_url', ''),
        download_url=data.get('download_url', '')
    )
    db.session.add(new_song)
    db.session.commit()
    return jsonify(new_song.to_dict()), 201

@main.route('/api/playlists/<int:playlist_id>/songs/<int:song_id>', methods=['DELETE'])
def remove_song_from_playlist(playlist_id, song_id):
    song = PlaylistSong.query.filter_by(playlist_id=playlist_id, id=song_id).first_or_404()
    db.session.delete(song)
    db.session.commit()
    return jsonify({"success": True}), 200


def _song_payload(data):
    return {
        "song_id": data.get("song_id", ""),
        "title": data.get("title", "Unknown Title"),
        "artist": data.get("artist", "Unknown Artist"),
        "image_url": data.get("image_url", ""),
        "download_url": data.get("download_url", ""),
        "album_id": data.get("album_id", ""),
        "album_name": data.get("album_name", ""),
        "artist_name": data.get("artist_name", data.get("artist", "")),
    }


@main.route('/api/activity/home-data', methods=['GET'])
def get_home_data():
    history_rows = UserRecentPlay.query.order_by(UserRecentPlay.played_at.desc()).limit(12).all()
    history = [row.to_song_dict() for row in history_rows]

    favorites_rows = UserSongActivity.query.filter_by(is_favorite=True).order_by(UserSongActivity.last_played_at.desc(), UserSongActivity.play_count.desc()).limit(12).all()
    favorites = [row.to_song_dict() for row in favorites_rows]

    most_played_rows = UserSongActivity.query.filter(UserSongActivity.play_count > 0).order_by(UserSongActivity.play_count.desc()).limit(12).all()
    most_played = [row.to_song_dict() for row in most_played_rows]

    query_rows = db.session.query(UserSearchQuery).order_by(UserSearchQuery.created_at.desc()).limit(12).all()
    recent_queries = []
    seen_queries = set()
    for row in query_rows:
        key = row.query.lower()
        if key in seen_queries:
            continue
        seen_queries.add(key)
        recent_queries.append(row.query)
        if len(recent_queries) >= 8:
            break

    feed_rows = UserFeedSong.query.order_by(UserFeedSong.score.desc(), UserFeedSong.updated_at.desc()).limit(18).all()
    feed = [row.to_song_dict() for row in feed_rows]

    reference_artist = ""
    if history:
        reference_artist = (history[0].get("artist") or "").split(',')[0].strip()
    elif most_played:
        reference_artist = (most_played[0].get("artist") or "").split(',')[0].strip()

    more_by_artist = []
    if reference_artist:
        local_pool = feed + history + most_played
        seen_song_ids = set()
        for song in local_pool:
            song_id = song.get("song_id")
            artist = (song.get("artist") or "").lower()
            if not song_id or song_id in seen_song_ids:
                continue
            if reference_artist.lower() in artist:
                seen_song_ids.add(song_id)
                more_by_artist.append(song)
            if len(more_by_artist) >= 10:
                break

    recent_artists = []
    seen_artists = set()
    for row in (history_rows + most_played_rows):
        artist_name = (row.artist or "").split(',')[0].strip()
        if artist_name and artist_name not in seen_artists:
            seen_artists.add(artist_name)
            # Find a song by this artist to get an image
            song_for_artist = next((s for s in (history + most_played + feed) if artist_name.lower() in (s.get("artist") or "").lower()), None)
            recent_artists.append({
                "name": artist_name,
                "image_url": song_for_artist.get("image_url") if song_for_artist else ""
            })
            if len(recent_artists) >= 8:
                break

    return jsonify({
        "history": history,
        "favorites": favorites,
        "most_played": most_played,
        "recent_queries": recent_queries,
        "feed": feed,
        "more_by_artist": more_by_artist,
        "reference_artist": reference_artist,
        "recent_artists": recent_artists
    })


@main.route('/api/activity/play', methods=['POST'])
def track_play():
    data = request.get_json() or {}
    song = _song_payload(data)
    if not song["song_id"]:
        return jsonify({"ok": False, "message": "song_id is required"}), 400

    activity = UserSongActivity.query.filter_by(song_id=song["song_id"]).first()
    if not activity:
        activity = UserSongActivity(song_id=song["song_id"])
        db.session.add(activity)

    activity.title = song["title"]
    activity.artist = song["artist"]
    activity.image_url = song["image_url"]
    activity.download_url = song["download_url"]
    activity.album_id = song["album_id"]
    activity.album_name = song["album_name"]
    activity.artist_name = song["artist_name"]
    activity.play_count = (activity.play_count or 0) + 1
    activity.last_played_at = datetime.utcnow()

    recent = UserRecentPlay(**song)
    db.session.add(recent)
    db.session.flush()

    overflow = UserRecentPlay.query.order_by(UserRecentPlay.played_at.desc()).offset(80).all()
    for row in overflow:
        db.session.delete(row)

    db.session.commit()
    return jsonify({"ok": True, "play_count": activity.play_count})


@main.route('/api/activity/favorite', methods=['POST'])
def toggle_favorite():
    data = request.get_json() or {}
    song = _song_payload(data)
    if not song["song_id"]:
        return jsonify({"ok": False, "message": "song_id is required"}), 400

    activity = UserSongActivity.query.filter_by(song_id=song["song_id"]).first()
    if not activity:
        activity = UserSongActivity(song_id=song["song_id"], play_count=0)
        db.session.add(activity)

    activity.title = song["title"]
    activity.artist = song["artist"]
    activity.image_url = song["image_url"]
    activity.download_url = song["download_url"]
    activity.album_id = song["album_id"]
    activity.album_name = song["album_name"]
    activity.artist_name = song["artist_name"]
    activity.last_played_at = activity.last_played_at or datetime.utcnow()
    activity.is_favorite = not bool(activity.is_favorite)

    db.session.commit()
    return jsonify({"ok": True, "is_favorite": activity.is_favorite})


@main.route('/api/activity/search', methods=['POST'])
def save_search_activity():
    data = request.get_json() or {}
    query = (data.get('query') or '').strip()
    songs = data.get('songs') or []

    if query:
        db.session.add(UserSearchQuery(query=query))

    for song_data in songs[:12]:
        song = _song_payload(song_data)
        if not song["song_id"]:
            continue
        feed_item = UserFeedSong.query.filter_by(song_id=song["song_id"]).first()
        if not feed_item:
            feed_item = UserFeedSong(song_id=song["song_id"])
            db.session.add(feed_item)

        feed_item.title = song["title"]
        feed_item.artist = song["artist"]
        feed_item.image_url = song["image_url"]
        feed_item.download_url = song["download_url"]
        feed_item.album_id = song["album_id"]
        feed_item.album_name = song["album_name"]
        feed_item.artist_name = song["artist_name"]
        feed_item.score = (feed_item.score or 0) + 1
        feed_item.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"ok": True})
