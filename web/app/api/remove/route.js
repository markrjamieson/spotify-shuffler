import { NextResponse } from "next/server";
import { getValidAccessToken, deletePlaylist } from "../../../lib/spotify";
import { removeShuffler } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  }

  const { playlistId } = await request.json();
  if (!playlistId) {
    return NextResponse.json({ error: "missing_playlist" }, { status: 400 });
  }

  try {
    await deletePlaylist(accessToken, playlistId);
    const shufflers = removeShuffler(playlistId);
    return NextResponse.json({ shufflers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
