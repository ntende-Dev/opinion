"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { findUserByResetToken } from "@/lib/reset";

/**
 * Consumes a reset link: validates the token server-side (never trust the
 * page), sets the new bcrypt hash, and clears the token so every link is
 * single-use — a replayed URL dies here.
 */
export async function resetPassword(token: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // The same minimum the signup form enforces — no invented complexity rules.
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }

  const user = await findUserByResetToken(token);
  if (!user) {
    return { error: "This reset link is no longer valid. Request a new one." };
  }

  const passwordHash = await hash(password, 10);

  await db
    .update(users)
    .set({
      password: passwordHash,
      resetToken: null,
      resetTokenExpires: null,
      // Setting a password by following the emailed link proves control of
      // the mailbox, so an account that never finished email verification is
      // un-stuck instead of trapped in a loop.
      emailVerified: user.emailVerified ?? new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  redirect("/login?reset=1");
}
