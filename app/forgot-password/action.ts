"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail } from "@/lib/email";
import { RESET_TTL_MS, generateResetToken, hashResetToken } from "@/lib/reset";

/**
 * A short per-email cooldown so the paper's address cannot be turned into a
 * mail-bombing pipe. In-memory on purpose: per instance is enough to stop
 * hammering, and no database round-trip is spent on abuse control.
 */
const lastRequestAt = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000;

/**
 * Asks for a reset link. The response is the same whether or not the email is
 * registered — otherwise this form would tell the world which addresses have
 * accounts. Any previous token is overwritten, so a fresh request kills the
 * old link.
 */
export async function requestReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // The email shape is the only thing we may report on — it reveals nothing
  // about whether the address is registered.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: true as const };
  }

  const previous = lastRequestAt.get(email);
  if (previous && Date.now() - previous < COOLDOWN_MS) {
    return { ok: true as const };
  }
  lastRequestAt.set(email, Date.now());

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return { ok: true as const };
  }

  const raw = generateResetToken();
  const expires = new Date(Date.now() + RESET_TTL_MS).toISOString();

  await db
    .update(users)
    .set({ resetToken: hashResetToken(raw), resetTokenExpires: expires })
    .where(eq(users.id, user.id));

  await sendPasswordResetEmail(email, raw, user.name);

  return { ok: true as const };
}
