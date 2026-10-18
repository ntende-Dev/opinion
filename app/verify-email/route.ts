import { NextResponse } from "next/server";

/**
 * Compat for verification emails sent before the link fix: they pointed at
 * /verify-email (this path) instead of /api/verify-email. Forward the token
 * through so stale inboxes still land on the login page with the real result.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = new URL("/api/verify-email", req.url);
  const token = searchParams.get("token");
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target, 307);
}
