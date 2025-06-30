import spotipy
from spotipy.oauth2 import SpotifyOAuth
import json

import os

# Set your Spotify API credentials as environment variables
# CLIENT_ID: Your Spotify application's client ID
CLIENT_ID = os.environ.get('SPOTIPY_CLIENT_ID')
# CLIENT_SECRET: Your Spotify application's client secret
CLIENT_SECRET = os.environ.get('SPOTIPY_CLIENT_SECRET')
# REDIRECT_URI: The URI to redirect to after the user grants permission
REDIRECT_URI='http://127.0.0.1:9090'

if not CLIENT_ID or not CLIENT_SECRET:
    raise EnvironmentError("Please set the SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET environment variables.")

# Set up the Spotify authentication using the Spotipy library
# This requires setting up a Spotify application and obtaining the necessary credentials
scope = "playlist-modify-public playlist-modify-private user-library-read"
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id=CLIENT_ID,
                                                client_secret=CLIENT_SECRET,
                                                redirect_uri=REDIRECT_URI,
                                                scope=scope))

# Function to gather episodes from a podcast feed given a podcast ID
def get_podcast_episodes(podcast_id, limit=50):
    """
    Retrieves all episodes from a given podcast ID using the Spotify API.
    Args:
        podcast_id (str): The Spotify ID of the podcast.
        limit (int): The number of episodes to retrieve per request (default: 50).
    Returns:
        list: A list of Spotify episode URIs.
    """
    episodes = []
    offset = 0  # Start from the first episode
    
    while True:
        # Get a page of episodes from the Spotify API
        results = sp.show_episodes(podcast_id, limit=limit, offset=offset)

        # Add the episode URIs to the list
        for episode in results['items']:
            episodes.append(episode['uri'])
        
        # Check if there are more episodes to fetch
        if results['next']:
            offset += limit  # Update the offset for the next batch of episodes
        else:
            break  # No more episodes, exit the loop
    
    return episodes

# Function to create a new playlist for the user
def create_playlist(user_id, playlist_name):
    """
    Creates a new public playlist for the given user.
    Args:
        user_id (str): The Spotify ID of the user.
        playlist_name (str): The name of the playlist to create.
    Returns:
        str: The ID of the newly created playlist.
    """
    playlist = sp.user_playlist_create(user_id, playlist_name, public=True)
    return playlist['id']

# Function to add episodes to a playlist in chunks
def add_episodes_to_playlist(playlist_id, episode_uris):
    """
    Adds episodes to a playlist in chunks of 100, as the Spotify API limits the number of episodes that can be added in a single request.
    Args:
        playlist_id (str): The Spotify ID of the playlist.
        episode_uris (list): A list of Spotify episode URIs to add to the playlist.
    """
    for i in range(0, len(episode_uris), 100):
        chunk = episode_uris[i:i+100]
        # Add the current chunk to the playlist
        sp.playlist_add_items(playlist_id, chunk)
        print(f"Added {len(chunk)} episodes to the playlist.")

# Main function to orchestrate the playlist creation and updating process
def main():
    """
    Main function to:
    1. Prompt the user for a podcast name.
    2. Search for podcasts on Spotify.
    3. Present the user with a list of podcasts to choose from.
    4. Retrieve all episodes from the selected podcast.
    5. Ask the user if they want to use the default playlist name or enter a custom one.
    6. Check if a playlist with the chosen name already exists.
    7. If it exists, retrieve existing episodes.
    8. Add only the new episodes to the playlist.
    """
    user_id = sp.current_user()['id']  # Get the current user's ID
    
    # Prompt the user for the podcast name
    podcast_name = input("Enter the name of the podcast: ")

    # Search for podcasts
    results = sp.search(q=podcast_name, type='show', limit=5)

    # Present the user with options
    print("Please select the podcast you want to use:")
    for i, item in enumerate(results['shows']['items']):
        print(f"{i+1}. {item['name']} - {item['publisher']}")

    # Get the user's selection
    while True:
        try:
            selection = int(input("Enter the number of your selection (1-5): "))
            if 1 <= selection <= 5 and selection <= len(results['shows']['items']):
                break
            else:
                print("Invalid selection. Please enter a number between 1 and", len(results['shows']['items']), end=".\n")
        except ValueError:
            print("Invalid input. Please enter a number.")

    # Get the selected podcast's ID (Spotify URI)
    podcast_id = results['shows']['items'][selection-1]['uri']

    # Gather podcast episodes using the podcast ID
    episodes = get_podcast_episodes(podcast_id)

    # Get the selected podcast's name for use in the default playlist name
    podcast_name = results['shows']['items'][selection-1]['name']

    # Ask the user if they want to use the default playlist name or set a custom one
    use_default_name = input("Use default playlist name? ('<podcast-name> Shuffler') (y/n): ").lower()

    if use_default_name == 'y':
        playlist_name = f"{podcast_name} Shuffler"
    else:
        playlist_name = input("Enter the name of the playlist: ")

    # Check if a playlist with the same name already exists for the user
    playlists = sp.user_playlists(user_id)
    playlist_id = None
    for playlist in playlists['items']:
        if playlist['name'] == playlist_name:
            playlist_id = playlist['id']
            break

    if playlist_id is None:
        # Create a new playlist if one doesn't exist
        playlist_id = create_playlist(user_id, playlist_name)
    
    # Get existing episodes in playlist to avoid duplicates
    existing_episodes = []
    if playlist_id:
        offset = 0
        limit = 100
        while True:
            results = sp.playlist_items(playlist_id, offset=offset, limit=limit)
            for item in results['items']:
                if item['track'] and item['track']['type'] == 'episode':
                    existing_episodes.append(item['track']['uri'])
            if results['next']:
                offset += limit
            else:
                break

    # Identify new episodes that are not already in the playlist
    new_episodes = [ep for ep in episodes if ep not in existing_episodes]
    # Add only the new episodes to the playlist
    add_episodes_to_playlist(playlist_id, new_episodes)

    print(f"Successfully added episodes to playlist: {playlist_id}")

if __name__ == '__main__':
    main()
