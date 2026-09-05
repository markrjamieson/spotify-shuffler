import { NextResponse } from "next/server";
import {
  getValidAccessToken,
  getAllPlaylists,
  searchShows,
} from "../../../lib/spotify";
import { readShufflers, upsertShuffler } from "../../../lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  }

  try {
    const existing = readShufflers();
    const existingIds = new Set(existing.map((s) => s.playlistId));

    const playlists = await getAllPlaylists(accessToken);
    const candidates = playlists.filter(
      (p) => p.name.includes("Shuffler") && !existingIds.has(p.id)
    );

    let shufflers = existing;
    for (const playlist of candidates) {
      const baseName = playlist.name.replace(/\s*Shuffler$/, "").trim();
      const matches = await searchShows(accessToken, baseName, 1);
      const show = matches[0];
      shufflers = upsertShuffler({
        showId: show ? show.id : null,
        showName: show ? show.name : baseName,
        playlistId: playlist.id,
        playlistName: playlist.name,
        episodeCount: playlist.trackCount,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ shufflers, addedCount: candidates.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
