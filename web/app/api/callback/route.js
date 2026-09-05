import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens } from "../../../lib/spotify";
import { writeTokens } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expectedState = cookies().get("sp_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, url));
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", url));
  }

  const tokens = await exchangeCodeForTokens(code);
  writeTokens(tokens);
  cookies().delete("sp_oauth_state");

  return NextResponse.redirect(new URL("/", url));
}
