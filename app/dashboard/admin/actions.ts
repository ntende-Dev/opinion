"use server";

import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const ROLES = ["contributor", "editor", "admin"];

/**
 * Role change is an admin-only action. Self-demotion is refused so the last
 * admin can never lock themselves out of the dashboard.
 */
export async function setRole(userId: number, role: string) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    throw new Error("Only an admin can change roles");
  }
  if (!ROLES.includes(role)) {
    throw new Error("Unknown role");
  }
  const selfId = Number((session.user as any).id);
  if (userId === selfId) {
    throw new Error("You cannot change your own role");
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return { ok: true };
}
