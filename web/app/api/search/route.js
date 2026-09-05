import { NextResponse } from "next/server";
import { getValidAccessToken, searchShows } from "../../../lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }
  const shows = await searchShows(accessToken, q);
  return NextResponse.json({ shows });
}
