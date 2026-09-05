# Spotify Podcast Playlist Shuffler

**Live app:** https://spotify-shuffler-silk.vercel.app

A web app for building "shuffler" playlists from a podcast's full episode
catalog. Log in with Spotify, search for a podcast, and create a playlist
with all its episodes (oldest-first). Come back later and it recognizes the
playlists you've already made and offers an **Update** button that adds only
the newly released episodes.

The whole app lives in [`web/`](web/) — see [`web/README.md`](web/README.md)
for architecture, environment variables, local dev, and how to redeploy to
Vercel.

## CLI scripts (legacy)

Two standalone Python scripts predate the web app and still work if you
prefer the command line:

- `create_shuffling_pod_playlist.py` — creates/updates a playlist with every
  episode of a chosen podcast.
- `create_episode_range_playlist.py` — same, but lets you pick a specific
  episode range (e.g. episodes 10–40) and playback order.

Both require `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` environment
variables and the `spotipy` package (`pip install spotipy`). They're kept for
reference; the web app in `web/` covers the same functionality without needing
a terminal.
