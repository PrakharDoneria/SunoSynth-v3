from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Playlist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    songs = db.relationship('PlaylistSong', backref='playlist', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "song_count": len(self.songs)
        }

class PlaylistSong(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlist.id'), nullable=False)
    song_id = db.Column(db.String(50), nullable=False) # JioSaavn ID
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    image_url = db.Column(db.String(500))
    download_url = db.Column(db.String(500))
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "playlist_id": self.playlist_id,
            "song_id": self.song_id,
            "title": self.title,
            "artist": self.artist,
            "image_url": self.image_url,
            "download_url": self.download_url,
            "added_at": self.added_at.isoformat()
        }


class UserSongActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, index=True)
    song_id = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    image_url = db.Column(db.String(500))
    download_url = db.Column(db.String(500))
    album_id = db.Column(db.String(50))
    album_name = db.Column(db.String(200))
    artist_name = db.Column(db.String(200))
    play_count = db.Column(db.Integer, default=0)
    is_favorite = db.Column(db.Boolean, default=False)
    last_played_at = db.Column(db.DateTime)

    def to_song_dict(self):
        return {
            "song_id": self.song_id,
            "title": self.title,
            "artist": self.artist,
            "image_url": self.image_url,
            "download_url": self.download_url,
            "album_id": self.album_id,
            "album_name": self.album_name,
            "artist_name": self.artist_name,
            "play_count": self.play_count,
            "is_favorite": self.is_favorite,
            "last_played_at": self.last_played_at.isoformat() if self.last_played_at else None,
        }


class UserRecentPlay(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, index=True)
    song_id = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    image_url = db.Column(db.String(500))
    download_url = db.Column(db.String(500))
    album_id = db.Column(db.String(50))
    album_name = db.Column(db.String(200))
    artist_name = db.Column(db.String(200))
    played_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_song_dict(self):
        return {
            "song_id": self.song_id,
            "title": self.title,
            "artist": self.artist,
            "image_url": self.image_url,
            "download_url": self.download_url,
            "album_id": self.album_id,
            "album_name": self.album_name,
            "artist_name": self.artist_name,
        }


class UserSearchQuery(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, index=True)
    query = db.Column(db.String(200), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


class UserFeedSong(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    image_url = db.Column(db.String(500))
    download_url = db.Column(db.String(500))
    album_id = db.Column(db.String(50))
    album_name = db.Column(db.String(200))
    artist_name = db.Column(db.String(200))
    score = db.Column(db.Integer, default=1)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_song_dict(self):
        return {
            "song_id": self.song_id,
            "title": self.title,
            "artist": self.artist,
            "image_url": self.image_url,
            "download_url": self.download_url,
            "album_id": self.album_id,
            "album_name": self.album_name,
            "artist_name": self.artist_name,
        }
