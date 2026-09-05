import { NextResponse } from "next/server";
import {
  getValidAccessToken,
  getAllEpisodes,
  getPlaylistEpisodeUris,
  addEpisodesToPlaylist,
} from "../../../lib/spotify";
import { upsertShuffler } from "../../../lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  }

  const { showId, showName, playlistId, playlistName } = await request.json();
  if (!showId || !playlistId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const episodes = await getAllEpisodes(accessToken, showId);
    const existingUris = await getPlaylistEpisodeUris(accessToken, playlistId);
    const newUris = episodes.map((e) => e.uri).filter((uri) => !existingUris.has(uri));
    await addEpisodesToPlaylist(accessToken, playlistId, newUris);

    const shuffler = {
      showId,
      showName,
      playlistId,
      playlistName,
      episodeCount: episodes.length,
      updatedAt: new Date().toISOString(),
    };
    const shufflers = upsertShuffler(shuffler);

    return NextResponse.json({ shuffler, addedCount: newUris.length, shufflers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
