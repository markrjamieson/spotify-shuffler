# Spotify Podcast Playlist Shuffler

This script creates a Spotify playlist containing all episodes of a selected podcast. It allows you to choose a podcast by searching for it on Spotify, and then creates a playlist with all of its episodes. The script also checks for existing episodes in the playlist to avoid duplicates.

## Prerequisites

*   Python 3
*   Spotipy library (`pip install spotipy`)
*   A Spotify application with the necessary permissions (playlist-modify-public, playlist-modify-private, user-library-read)

## Setup

1.  **Create a Spotify application:**
    *   Go to [https://developer.spotify.com/dashboard/](https://developer.spotify.com/dashboard/) and create a new application.
    *   Note the Client ID and Client Secret.
    *   Set the Redirect URI to `http://127.0.0.1:9090`.

2.  **Set environment variables:**
    *   Create a file named `setenv.sh` in the same directory as the script.
    *   Add the following lines to `setenv.sh`, replacing `your_client_id` and `your_client_secret` with your actual Client ID and Client Secret:

    ```bash
    export SPOTIPY_CLIENT_ID="your_client_id"
    export SPOTIPY_CLIENT_SECRET="your_client_secret"
    ```

    *   Make the script executable:

    ```bash
    chmod +x setenv.sh
    ```

3.  **Install dependencies:**

    ```bash
    pip install spotipy
    ```

## Usage

1.  **Run the script:**

    *   Source the `setenv.sh` file to set the environment variables:

    ```bash
    source setenv.sh
    ```

    *   Run the script:

    ```bash
    python3 create_shuffling_pod_playlist.py
    ```

2.  **Follow the prompts:**

    *   The script will prompt you to enter the name of the podcast you want to use.
    *   It will then present you with a list of options. Select the correct podcast by entering the corresponding number.
    *   The script will ask if you want to use the default playlist name (Podcast Name Shuffler) or enter a custom name.

## Notes

*   The script uses pagination to retrieve all episodes from the podcast, so it can handle podcasts with a large number of episodes.
*   The script checks for existing episodes in the playlist to avoid duplicates.
*   The script requires the `SPOTIPY_CLIENT_ID` and `SPOTIPY_CLIENT_SECRET` environment variables to be set.

## setenv.sh

This file is used to set the environment variables required by the script. It is important to keep your Client ID and Client Secret secure, so do not commit this file to a public repository.

## create_shuffling_pod_playlist.py

This is the main script that creates the Spotify playlist. It uses the Spotipy library to interact with the Spotify API.