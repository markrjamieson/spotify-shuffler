import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUrl } from "../../../lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set("sp_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
