import spotipy
from spotipy.oauth2 import SpotifyOAuth
import logging
import os
from datetime import datetime

CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET')
REDIRECT_URI = 'http://127.0.0.1:9090'

if not CLIENT_ID or not CLIENT_SECRET:
    raise EnvironmentError("Please set the SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.")

log_filename = f"spotify_shuffler_{datetime.now().strftime('%Y%m%d')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

scope = "playlist-modify-public playlist-modify-private user-library-read"
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id=CLIENT_ID,
                                                client_secret=CLIENT_SECRET,
                                                redirect_uri=REDIRECT_URI,
                                                scope=scope))

try:
    user_info = sp.current_user()
    logger.info(f"Successfully authenticated. User: {user_info['id']} ({user_info.get('display_name', 'N/A')})")
except Exception as e:
    logger.error(f"Failed to authenticate with Spotify API: {str(e)}")
    raise


def get_all_episodes(podcast_id, limit=50):
    """Fetches all episodes for a show, sorted oldest-first. Returns list of dicts with uri, name, release_date."""
    episode_details = []
    offset = 0
    while True:
        results = sp.show_episodes(podcast_id, limit=limit, offset=offset)
        for episode in results['items']:
            episode_details.append({
                'uri': episode['uri'],
                'name': episode['name'],
                'release_date': episode.get('release_date', '1900-01-01')
            })
        if results['next']:
            offset += limit
        else:
            break
    return sorted(episode_details, key=lambda x: x['release_date'])


def create_playlist(user_id, playlist_name):
    playlist = sp.user_playlist_create(user_id, playlist_name, public=True)
    playlist_id = playlist['id']
    logger.info(f"Created playlist: '{playlist_name}' (ID: {playlist_id})")
    return playlist_id


def add_episodes_to_playlist(playlist_id, episode_uris):
    if not episode_uris:
        logger.info("No episodes to add.")
        return
    for i in range(0, len(episode_uris), 100):
        chunk = episode_uris[i:i + 100]
        sp.playlist_add_items(playlist_id, chunk)
        logger.info(f"Added chunk of {len(chunk)} episode(s) to playlist (ID: {playlist_id})")
    logger.info(f"Done. Total episodes added: {len(episode_uris)}")


def get_int_input(prompt, min_val, max_val):
    while True:
        try:
            val = int(input(prompt))
            if min_val <= val <= max_val:
                return val
            print(f"Please enter a number between {min_val} and {max_val}.")
        except ValueError:
            print("Invalid input. Please enter a number.")


def main():
    user_id = sp.current_user()['id']

    podcast_name = input("Enter the name of the podcast: ")
    results = sp.search(q=podcast_name, type='show', limit=5)
    shows = results['shows']['items']

    if not shows:
        print("No podcasts found. Try a different search term.")
        return

    print("\nPlease select the podcast:")
    for i, item in enumerate(shows):
        print(f"  {i + 1}. {item['name']} - {item['publisher']}")

    selection = get_int_input("Enter the number of your selection: ", 1, len(shows))
    podcast_id = shows[selection - 1]['uri']
    selected_podcast_name = shows[selection - 1]['name']
    logger.info(f"Selected podcast: '{selected_podcast_name}' (ID: {podcast_id})")

    print(f"\nFetching episodes for '{selected_podcast_name}'...")
    all_episodes = get_all_episodes(podcast_id)
    total = len(all_episodes)
    logger.info(f"Retrieved {total} episode(s) from '{selected_podcast_name}'")

    if total == 0:
        print("No episodes found for this podcast.")
        return

    print(f"\nFound {total} episode(s).")
    order = input("Add episodes oldest-first or newest-first? (o/n): ").lower()
    if order == 'n':
        all_episodes = list(reversed(all_episodes))
        order_label = "newest-first"
    else:
        order_label = "oldest-first"
    logger.info(f"Episode order: {order_label}")

    print(f"  Episode 1:    {all_episodes[0]['name']} ({all_episodes[0]['release_date']})")
    print(f"  Episode {total}: {all_episodes[-1]['name']} ({all_episodes[-1]['release_date']})")

    print(f"\nEnter the episode range to include (1–{total}):")
    from_ep = get_int_input(f"  From episode: ", 1, total)
    to_ep = get_int_input(f"  To episode:   ", from_ep, total)

    selected_episodes = all_episodes[from_ep - 1:to_ep]
    logger.info(f"Selected episodes {from_ep}–{to_ep} ({len(selected_episodes)} episode(s))")

    default_name = f"{selected_podcast_name} Ep {from_ep}–{to_ep}"
    use_default = input(f"\nUse default playlist name? ('{default_name}') (y/n): ").lower()
    playlist_name = default_name if use_default == 'y' else input("Enter the playlist name: ")

    # Check for existing playlist with this name
    playlists = sp.user_playlists(user_id)
    playlist_id = None
    for pl in playlists['items']:
        if pl['name'] == playlist_name:
            playlist_id = pl['id']
            break

    if playlist_id is None:
        playlist_id = create_playlist(user_id, playlist_name)
    else:
        logger.info(f"Found existing playlist: '{playlist_name}' (ID: {playlist_id})")

    # Avoid duplicates
    existing_uris = set()
    offset = 0
    while True:
        page = sp.playlist_items(playlist_id, offset=offset, limit=100)
        for item in page['items']:
            if item['track'] and item['track']['type'] == 'episode':
                existing_uris.add(item['track']['uri'])
        if page['next']:
            offset += 100
        else:
            break
    logger.info(f"Playlist already contains {len(existing_uris)} episode(s)")

    new_uris = [ep['uri'] for ep in selected_episodes if ep['uri'] not in existing_uris]
    logger.info(f"{len(new_uris)} new episode(s) to add")

    add_episodes_to_playlist(playlist_id, new_uris)
    print(f"\nDone! Playlist '{playlist_name}' updated with {len(new_uris)} new episode(s).")
    print(f"Playlist ID: {playlist_id}")


if __name__ == '__main__':
    main()
