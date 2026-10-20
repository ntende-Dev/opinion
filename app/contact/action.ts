"use server";

import { db } from "@/drizzle/db";
import { contactMessages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { EDITORS } from "@/lib/roles";
import { sendContactEmail } from "@/lib/email";

export async function send(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim(); // honeypot

  if (!name || !email || !subject || !message) {
    return { error: "All fields are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (message.length > 5000) {
    return { error: "Message is too long (max 5000 characters)." };
  }

  // Hidden field: real visitors never fill it. Accept silently so bots move on.
  if (website) {
    return { ok: true };
  }

  await db.insert(contactMessages).values({
    name,
    email,
    subject,
    message,
    handled: "false",
    createdAt: new Date().toISOString(),
  });

  // Keep the failure silent for the reader; the message is stored regardless.
  await sendContactEmail(name, email, subject, message).catch(() => {});

  return { ok: true };
}

export async function markHandled(formData: FormData) {
  const session = await auth();
  if (!session || !EDITORS.includes((session.user as any).role)) {
    return;
  }

  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id)) return;

  await db
    .update(contactMessages)
    .set({ handled: "true" })
    .where(eq(contactMessages.id, id));

  revalidatePath("/dashboard/messages");
}

/**
 * Remove a message outright. Admin-only — editors mark messages handled, but
 * taking one out of the paper's record is a step further.
 */
export async function deleteMessage(id: number) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    throw new Error("Only an admin can delete messages");
  }
  if (!Number.isInteger(id)) return;

  await db.delete(contactMessages).where(eq(contactMessages.id, id));
  revalidatePath("/dashboard/messages");
  return { ok: true as const };
}
