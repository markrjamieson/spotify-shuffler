import { cookies } from "next/headers";
import { encrypt, decrypt } from "./crypto";

const TOKEN_COOKIE = "sp_session";
const SHUFFLERS_COOKIE = "sp_shufflers";
const CREDS_COOKIE = "sp_creds";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function baseCookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function readTokens() {
  const raw = cookies().get(TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export function writeTokens(tokens) {
  const raw = Buffer.from(JSON.stringify(tokens), "utf-8").toString("base64");
  cookies().set(TOKEN_COOKIE, raw, baseCookieOpts());
}

export function clearTokens() {
  cookies().delete(TOKEN_COOKIE);
}

export function readShufflers() {
  const raw = cookies().get(SHUFFLERS_COOKIE)?.value;
  if (!raw) return [];
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return [];
  }
}

export function writeShufflers(shufflers) {
  const raw = Buffer.from(JSON.stringify(shufflers), "utf-8").toString("base64");
  cookies().set(SHUFFLERS_COOKIE, raw, baseCookieOpts());
}

// Overrides for the Spotify app's own client ID/secret, set via the /settings
// UI. Stored encrypted (server-key AES-256-GCM) in an httpOnly cookie so the
// browser never holds the raw cookie value; only /api/credentials can reveal
// the decrypted values back to the owning browser on request.
export function readCredsOverride() {
  const raw = cookies().get(CREDS_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decrypt(raw));
  } catch {
    return null;
  }
}

export function writeCredsOverride(creds) {
  const encrypted = encrypt(JSON.stringify(creds));
  cookies().set(CREDS_COOKIE, encrypted, baseCookieOpts());
}

export function clearCredsOverride() {
  cookies().delete(CREDS_COOKIE);
}

export function upsertShuffler(shuffler) {
  const shufflers = readShufflers();
  const idx = shufflers.findIndex((s) => s.playlistId === shuffler.playlistId);
  if (idx >= 0) {
    shufflers[idx] = shuffler;
  } else {
    shufflers.push(shuffler);
  }
  writeShufflers(shufflers);
  return shufflers;
}

export function removeShuffler(playlistId) {
  const shufflers = readShufflers().filter((s) => s.playlistId !== playlistId);
  writeShufflers(shufflers);
  return shufflers;
}
