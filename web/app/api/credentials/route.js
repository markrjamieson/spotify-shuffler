import { NextResponse } from "next/server";
import { readCredsOverride, writeCredsOverride, clearCredsOverride } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  let override = null;
  try {
    override = readCredsOverride();
  } catch {
    // CREDENTIALS_ENCRYPTION_KEY missing/invalid — treat as no override.
  }
  const clientId = override?.clientId || process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = override?.clientSecret || process.env.SPOTIFY_CLIENT_SECRET || "";
  return NextResponse.json({ clientId, clientSecret, isCustom: !!override });
}

export async function POST(request) {
  const { clientId, clientSecret } = await request.json();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  try {
    writeCredsOverride({ clientId, clientSecret });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearCredsOverride();
  return NextResponse.json({ ok: true });
}
