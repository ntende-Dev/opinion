import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/** Avatar URLs must be keys served by our own image proxy. Keys are minted
 * by lib/storage.ts as stories/<uuid>.<ext> — accept exactly those. */
const AVATAR_RE = /^\/api\/images\/stories\/[a-f0-9-]{36}\.(jpe?g|png|webp|gif|avif)$/i;

async function profile(id: number) {
  const [u] = await db
    .select({
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, id));
  return u ?? null;
}

const UNAUTHORIZED = () =>
  NextResponse.json({ error: "Unauthorised" }, { status: 401 });

export async function GET() {
  const session = await auth();
  const id = (session?.user as any)?.id;
  if (!id) return UNAUTHORIZED();
  return NextResponse.json(await profile(Number(id)));
}

/** Update the signed-in user's own profile. Only the avatar for now. */
export async function PATCH(req: Request) {
  const session = await auth();
  const id = (session?.user as any)?.id;
  if (!id) return UNAUTHORIZED();

  const body = (await req.json().catch(() => ({}))) as { avatarUrl?: string };
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";

  if (avatarUrl && !AVATAR_RE.test(avatarUrl)) {
    return NextResponse.json(
      { error: "Avatar must be an image uploaded through this site" },
      { status: 400 },
    );
  }

  await db
    .update(users)
    .set({ avatarUrl: avatarUrl || null })
    .where(eq(users.id, Number(id)));

  return NextResponse.json(await profile(Number(id)));
}
