import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('JIOSAAVN_API_BASE_URL', 'https://api.paxsenix.org/jiosaavn')
API_KEY = os.getenv('JIOSAAVN_API_KEY', '')

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

def search_jiosaavn(query):
    """Search for songs or albums."""
    try:
        url = f"{API_BASE_URL}/search"
        params = {"q": query}
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching search results: {e}")
        return {"ok": False, "message": str(e), "results": []}

def get_album_details(album_id):
    """Get details for a specific album by ID."""
    try:
        url = f"{API_BASE_URL}/album"
        params = {"id": album_id}
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching album details: {e}")
        return {"ok": False, "message": str(e)}


def get_artist_details(artist_id):
    """Get details for a specific artist by ID."""
    try:
        url = f"{API_BASE_URL}/artist"
        params = {"id": artist_id}
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching artist details: {e}")
        return {"ok": False, "message": str(e)}
