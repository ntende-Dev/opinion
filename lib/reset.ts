import { createHash, randomBytes } from "crypto";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Reset tokens follow the verification-token pattern, but only the SHA-256
 * hash is ever stored (see drizzle/schema.ts) — the raw token lives only in
 * the emailed link, so a database leak does not yield working reset links.
 */
export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** One hour — password resets are more sensitive than email verification. */
export const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * The user a raw token belongs to, or null when the hash matches nobody or
 * the link has expired. The token's expiry is never extended by a lookup.
 */
export async function findUserByResetToken(raw: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.resetToken, hashResetToken(raw)));

  if (!user) return null;
  if (
    !user.resetTokenExpires ||
    new Date(user.resetTokenExpires) < new Date()
  ) {
    return null;
  }
  return user;
}

