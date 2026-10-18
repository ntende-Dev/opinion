export const FUNCTION_HELLO_BASE_URL =
  process.env.NEON_FUNCTION_HELLO_BASE_URL;

export async function callHello(name?: string) {
  if (!FUNCTION_HELLO_BASE_URL) {
    throw new Error("NEON_FUNCTION_HELLO_BASE_URL is not configured");
  }
  const url = new URL(FUNCTION_HELLO_BASE_URL);
  if (name) url.searchParams.set("name", name);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Function call failed: ${res.statusText}`);
  return res.text();
}
