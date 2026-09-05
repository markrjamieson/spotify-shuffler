import { NextResponse } from "next/server";
import { getValidAccessToken } from "../../../lib/spotify";
import { readShufflers } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = await getValidAccessToken().catch(() => null);
  if (!accessToken) {
    return NextResponse.json({ loggedIn: false, shufflers: [] });
  }
  return NextResponse.json({ loggedIn: true, shufflers: readShufflers() });
}
