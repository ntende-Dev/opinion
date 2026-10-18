"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hash(password, 10);
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  await db.insert(users).values({
    name,
    email,
    password: passwordHash,
    role: "contributor",
    emailVerified: null,
    verificationToken: token,
    verificationTokenExpires: expires,
  });

  await sendVerificationEmail(email, token, name);

  return { ok: true, email };
}
