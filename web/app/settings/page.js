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

const fieldWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const inputStyle = {
  padding: "0.5rem 0.75rem",
  borderRadius: 6,
  border: "1px solid #30363d",
  background: "#161b22",
  color: "#e6edf3",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "monospace",
};

const eyeBtnStyle = {
  background: "transparent",
  border: "1px solid #30363d",
  borderRadius: 6,
  color: "#8b949e",
  cursor: "pointer",
  padding: "0.5rem 0.6rem",
  flexShrink: 0,
};

function CredentialField({ label, value, onChange }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", marginBottom: "0.35rem", color: "#8b949e" }}>
        {label}
      </label>
      <div style={fieldWrapStyle}>
        <input
          style={inputStyle}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          style={eyeBtnStyle}
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? "Hide" : "Reveal"}
          title={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((data) => {
        setClientId(data.clientId || "");
        setClientSecret(data.clientSecret || "");
        setIsCustom(data.isCustom);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setIsCustom(true);
      setMessage("Saved. Log out and back in for the new credentials to take effect.");
    } catch (err) {
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("reset_failed");
      const data = await fetch("/api/credentials").then((r) => r.json());
      setClientId(data.clientId || "");
      setClientSecret(data.clientSecret || "");
      setIsCustom(false);
      setMessage("Reverted to the server's default credentials.");
    } catch (err) {
      setMessage(`Reset failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Settings</h1>
        <Link href="/" style={{ color: "#8b949e" }}>
          ← Back
        </Link>
      </div>

      <p style={{ color: "#8b949e" }}>
        Spotify application credentials used to log in and manage playlists.
        Values are stored encrypted in your browser's cookie and never shown
        by default — click the eye icon to reveal.
        {isCustom && " (currently using a custom value you saved)"}
      </p>

      {message && (
        <p style={{ background: "#161b22", padding: "0.75rem", borderRadius: 6 }}>
          {message}
        </p>
      )}

      <form onSubmit={handleSave}>
        <CredentialField label="Client ID" value={clientId} onChange={setClientId} />
        <CredentialField label="Client Secret" value={clientSecret} onChange={setClientSecret} />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" style={btnStyle} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          {isCustom && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              style={{ ...btnStyle, background: "transparent", color: "#8b949e", border: "1px solid #30363d" }}
            >
              Reset to default
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
