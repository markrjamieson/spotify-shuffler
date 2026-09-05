"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const btnStyle = {
  padding: "0.5rem 1rem",
  borderRadius: 20,
  border: "none",
  background: "#1DB954",
  color: "#000",
  fontWeight: 600,
  cursor: "pointer",
};

const inputStyle = {
  padding: "0.5rem 0.75rem",
  borderRadius: 6,
  border: "1px solid #30363d",
  background: "#161b22",
  color: "#e6edf3",
  width: "100%",
  boxSizing: "border-box",
};

function formatUpdatedAt(isoString) {
  if (!isoString) return "never";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shufflers, setShufflers] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(null); // id of in-flight action
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setLoggedIn(data.loggedIn);
        setShufflers(data.shufflers || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-search as the user types, debounced.
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.shows);
          setSuggestOpen(true);
        }
      } catch {
        // Ignore — the user can keep typing.
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleCreate(show) {
    setMessage("");
    setBusy(show.id);
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showId: show.id, showName: show.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create_failed");
      setShufflers(data.shufflers);
      setSuggestions([]);
      setSuggestOpen(false);
      setQuery("");
      setMessage(
        `Created "${data.shuffler.playlistName}" — added ${data.addedCount} episode(s).`
      );
    } catch (err) {
      setMessage(`Create failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleUpdate(shuffler) {
    setMessage("");
    setBusy(shuffler.playlistId);
    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shuffler),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "update_failed");
      setShufflers(data.shufflers);
      setMessage(
        `Updated "${data.shuffler.playlistName}" — added ${data.addedCount} new episode(s).`
      );
    } catch (err) {
      setMessage(`Update failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading...</p>;

  if (!loggedIn) {
    return (
      <div>
        <h1>Spotify Shuffler</h1>
        <p>Log in with Spotify to create and update podcast shuffler playlists.</p>
        <a href="/api/login">
          <button style={btnStyle}>Log in with Spotify</button>
        </a>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/settings" style={{ color: "#8b949e" }}>
            App credentials settings
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Spotify Shuffler</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/settings">
            <button style={{ ...btnStyle, background: "transparent", color: "#8b949e", border: "1px solid #30363d" }}>
              Settings
            </button>
          </Link>
          <button
            style={{ ...btnStyle, background: "transparent", color: "#8b949e", border: "1px solid #30363d" }}
            onClick={() => fetch("/api/logout", { method: "POST" }).then(() => window.location.reload())}
          >
            Log out
          </button>
        </div>
      </div>

      {message && (
        <p style={{ background: "#161b22", padding: "0.75rem", borderRadius: 6 }}>
          {message}
        </p>
      )}

      {shufflers.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>Your shuffler playlists</h2>
          {shufflers.map((s) => (
            <div
              key={s.playlistId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                border: "1px solid #30363d",
                borderRadius: 8,
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{s.playlistName}</div>
                <div style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                  {s.episodeCount} episode(s) &middot; last updated{" "}
                  {formatUpdatedAt(s.updatedAt)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <a
                  href={`https://open.spotify.com/playlist/${s.playlistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button
                    type="button"
                    style={{ ...btnStyle, background: "transparent", color: "#8b949e", border: "1px solid #30363d" }}
                  >
                    Open
                  </button>
                </a>
                <button
                  style={btnStyle}
                  disabled={busy === s.playlistId}
                  onClick={() => handleUpdate(s)}
                >
                  {busy === s.playlistId ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Create a new shuffler playlist</h2>
        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            placeholder="Start typing a podcast name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          />

          {suggestOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 8,
                zIndex: 10,
                overflow: "hidden",
              }}
            >
              {searching && (
                <div style={{ padding: "0.75rem", color: "#8b949e" }}>Searching...</div>
              )}
              {!searching && suggestions.length === 0 && (
                <div style={{ padding: "0.75rem", color: "#8b949e" }}>No podcasts found.</div>
              )}
              {!searching &&
                suggestions.map((show) => (
                  <button
                    key={show.id}
                    type="button"
                    disabled={busy === show.id}
                    onMouseDown={(e) => e.preventDefault()} // keep focus so onBlur doesn't fire first
                    onClick={() => handleCreate(show)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "0.75rem",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid #30363d",
                      color: "#e6edf3",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <div style={{ fontWeight: 600 }}>{show.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                        {show.publisher}
                      </div>
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                      {busy === show.id ? "Creating..." : "Create"}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
