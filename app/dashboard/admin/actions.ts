"use server";

import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { count, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

const ROLES = ["contributor", "editor", "admin"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every action here is admin-only; editors and contributors never get it. */
async function requireAdmin() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    throw new Error("Only an admin can manage users");
  }
  return Number((session!.user as any).id);
}

/**
 * Role change is an admin-only action. Self-demotion is refused so the last
 * admin can never lock themselves out of the dashboard.
 */
export async function setRole(userId: number, role: string) {
  const selfId = await requireAdmin();
  if (!ROLES.includes(role)) {
    throw new Error("Unknown role");
  }
  if (userId === selfId) {
    throw new Error("You cannot change your own role");
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return { ok: true };
}

export type NewUser = {
  name: string;
  email: string;
  role: string;
  password: string;
};

/**
 * Create an account outright: the admin chooses the first password, so the
 * account is born verified — no verification email, no waiting on the reader.
 * Sharing the password is the admin's job; the paper never emails one.
 */
export async function createUser(input: NewUser) {
  await requireAdmin();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    throw new Error("Name, email and password are all required.");
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!ROLES.includes(input.role)) {
    throw new Error("Unknown role");
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hash(password, 10);
  const [row] = await db
    .insert(users)
    .values({
      name,
      email,
      password: passwordHash,
      role: input.role,
      // Admin-created: trusted, so the account can sign in immediately.
      emailVerified: new Date().toISOString(),
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
    });

  revalidatePath("/dashboard/admin");
  return {
    ok: true as const,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      verified: row.emailVerified !== null && row.emailVerified !== "",
    },
  };
}

/**
 * Hard delete of an account. A user who has written stories keeps them — the
 * byline would otherwise point at nobody — so the delete is refused until
 * their stories are moved or removed. Self-deletion is refused for the same
 * reason a self-demotion is.
 */
export async function deleteUser(userId: number) {
  const selfId = await requireAdmin();
  if (userId === selfId) {
    throw new Error("You cannot delete your own account");
  }

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new Error("That account no longer exists");

  const [{ n: storyCount }] = await db
    .select({ n: count() })
    .from(stories)
    .where(eq(stories.authorId, userId));
  if (storyCount > 0) {
    throw new Error(
      `${user.name} has ${storyCount} ${storyCount === 1 ? "story" : "stories"} — delete or reassign them first.`,
    );
  }

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
  return { ok: true as const };
}
