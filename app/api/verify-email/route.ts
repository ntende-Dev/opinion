import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing-verification-token", req.url),
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token));

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-or-expired-verification-token", req.url),
    );
  }

  if (
    !user.verificationTokenExpires ||
    new Date(user.verificationTokenExpires) < new Date()
  ) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-or-expired-verification-token", req.url),
    );
  }

  await db
    .update(users)
    .set({
      emailVerified: new Date().toISOString(),
      verificationToken: null,
      verificationTokenExpires: null,
    })
    .where(eq(users.id, user.id));

  await sendWelcomeEmail(user.email, user.name);

  return NextResponse.redirect(
    new URL("/login?verified=1", req.url),
  );
}
