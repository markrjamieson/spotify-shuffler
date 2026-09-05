import { readTokens, writeTokens, readCredsOverride } from "./session";

const AUTH_BASE = "https://accounts.spotify.com";
const API_BASE = "https://api.spotify.com/v1";
const SCOPE = "playlist-modify-public playlist-modify-private user-library-read";

// Client ID/secret can be overridden per-browser via /settings (stored
// encrypted, see lib/session.js); env vars are the bootstrap default.
function creds() {
  let override = null;
  try {
    override = readCredsOverride();
  } catch {
    // CREDENTIALS_ENCRYPTION_KEY missing/invalid — fall back to env vars.
  }
  const clientId = override?.clientId || process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = override?.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Spotify client ID/secret (set them in /settings or via SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET env vars) or missing SPOTIFY_REDIRECT_URI env var"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function getAuthUrl(state) {
  const { clientId, redirectUri } = creds();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

async function tokenRequest(body) {
  const { clientId, clientSecret } = creds();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token request failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens(code) {
  const { redirectUri } = creds();
  const data = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

async function refreshTokens(refreshToken) {
  const data = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return {
    access_token: data.access_token,
    // Spotify sometimes omits refresh_token on refresh; keep the old one.
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

// Returns a valid access token, refreshing + persisting it if needed. Null if not logged in.
export async function getValidAccessToken() {
  const tokens = readTokens();
  if (!tokens) return null;
  if (tokens.expires_at - 30_000 > Date.now()) {
    return tokens.access_token;
  }
  const refreshed = await refreshTokens(tokens.refresh_token);
  writeTokens(refreshed);
  return refreshed.access_token;
}

async function api(accessToken, path, options = {}, retriesLeft = 5) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = Number(res.headers.get("retry-after")) || 1;
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return api(accessToken, path, options, retriesLeft - 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getCurrentUser(accessToken) {
  return api(accessToken, "/me");
}

export async function searchShows(accessToken, query, limit = 5) {
  const params = new URLSearchParams({ q: query, type: "show", limit: String(limit) });
  const data = await api(accessToken, `/search?${params.toString()}`);
  return data.shows.items.map((item) => ({
    id: item.id,
    uri: item.uri,
    name: item.name,
    publisher: item.publisher,
  }));
}

// All episodes for a show, sorted oldest first.
export async function getAllEpisodes(accessToken, showId) {
  const episodes = [];
  let offset = 0;
  const limit = 50;
  while (true) {
    const data = await api(
      accessToken,
      `/shows/${showId}/episodes?limit=${limit}&offset=${offset}`
    );
    for (const ep of data.items) {
      episodes.push({
        uri: ep.uri,
        name: ep.name,
        release_date: ep.release_date || "1900-01-01",
      });
    }
    if (data.next) {
      offset += limit;
    } else {
      break;
    }
  }
  episodes.sort((a, b) => (a.release_date < b.release_date ? -1 : 1));
  return episodes;
}

export async function findPlaylistByName(accessToken, userId, name) {
  let offset = 0;
  const limit = 50;
  while (true) {
    const data = await api(
      accessToken,
      `/me/playlists?limit=${limit}&offset=${offset}`
    );
    const found = data.items.find((p) => p.name === name);
    if (found) return found;
    if (data.next) {
      offset += limit;
    } else {
      break;
    }
  }
  return null;
}

export async function createPlaylist(accessToken, userId, name) {
  const playlist = await api(accessToken, `/users/${userId}/playlists`, {
    method: "POST",
    body: JSON.stringify({ name, public: true }),
  });
  return playlist.id;
}

export async function getAllPlaylists(accessToken) {
  const playlists = [];
  let offset = 0;
  const limit = 50;
  while (true) {
    const data = await api(
      accessToken,
      `/me/playlists?limit=${limit}&offset=${offset}`
    );
    for (const p of data.items) {
      playlists.push({ id: p.id, name: p.name, trackCount: p.tracks.total });
    }
    if (data.next) {
      offset += limit;
    } else {
      break;
    }
  }
  return playlists;
}

export async function deletePlaylist(accessToken, playlistId) {
  await api(accessToken, `/playlists/${playlistId}/followers`, {
    method: "DELETE",
  });
}

export async function getPlaylistEpisodeUris(accessToken, playlistId) {
  const uris = new Set();
  let offset = 0;
  const limit = 100;
  while (true) {
    const data = await api(
      accessToken,
      `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(uri,type)),next`
    );
    for (const item of data.items) {
      if (item.track && item.track.type === "episode") {
        uris.add(item.track.uri);
      }
    }
    if (data.next) {
      offset += limit;
    } else {
      break;
    }
  }
  return uris;
}

export async function addEpisodesToPlaylist(accessToken, playlistId, uris) {
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    await api(accessToken, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: chunk }),
    });
  }
}
