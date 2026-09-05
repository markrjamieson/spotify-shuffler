# Spotify Shuffler (web)

Next.js app version of the shuffler scripts. Log in with Spotify in the
browser, search for a podcast, create a "Shuffler" playlist with all its
episodes, and revisit later to update it with new episodes with one click.

## How it works

- Spotify OAuth Authorization Code flow (`/api/login`, `/api/callback`) — required
  because playlist writes need a logged-in user, not just client credentials.
- Access/refresh tokens are stored in an httpOnly cookie (`sp_session`),
  refreshed automatically when expired.
- Created playlists are tracked in a second cookie (`sp_shufflers`) — this is
  what lets the site recognize "you already made this shuffler" on a repeat
  visit and show an **Update** button instead of the create flow. No database.
- The Spotify app's own Client ID/Secret can be viewed/edited at `/settings`.
  They're encrypted (AES-256-GCM) into a third cookie (`sp_creds`) and only
  decrypted server-side when requested — the settings page masks them behind
  an eye-icon toggle. The `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` env vars
  are just the bootstrap default; whatever's saved via `/settings` overrides
  them.

## Local development

```bash
cd web
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

## Environment variables

| Variable | Value |
|---|---|
| `SPOTIFY_CLIENT_ID` | From your Spotify app |
| `SPOTIFY_CLIENT_SECRET` | From your Spotify app |
| `SPOTIFY_REDIRECT_URI` | `http://127.0.0.1:3000/api/callback` locally, `https://<your-domain>/api/callback` in production |
| `CREDENTIALS_ENCRYPTION_KEY` | 64-char hex string (32 bytes), e.g. `openssl rand -hex 32`. Encrypts the `/settings`-saved credentials cookie. |

Add `SPOTIFY_REDIRECT_URI`'s value as a Redirect URI on your app in the
[Spotify developer dashboard](https://developer.spotify.com/dashboard) — both
the local and production URLs need to be listed there.

## Deploying to Vercel

1. Push this repo to GitHub (if not already).
2. In Vercel: **New Project** → import the repo.
3. Set **Root Directory** to `web` (the Next.js app doesn't live at the repo root).
4. Add the four environment variables above under Project Settings → Environment
   Variables. Use your Vercel deployment URL for `SPOTIFY_REDIRECT_URI`,
   e.g. `https://spotify-shuffler.vercel.app/api/callback`.
5. Deploy. Then add that same redirect URI to the Spotify app's dashboard.
6. Once deployed, go to `/settings` in the app, regenerate the client secret
   in the Spotify dashboard (the old one leaked into git history — see below),
   and save the new Client ID/Secret there. No redeploy needed.

The client ID/secret previously committed to git history (in `../setenv.sh`)
are used as the initial `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` env var
values so the app works out of the box — replace them via `/settings` once
you've rotated the secret in the Spotify dashboard.
