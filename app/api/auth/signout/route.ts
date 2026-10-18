import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  for (const name of [
    "next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "next-auth.nonce",
  ]) {
    cookieStore.delete(name);
  }
  return Response.json({ ok: true });
}
