import { EXT_TYPES, getObjectBytes } from "@/lib/storage";

const RE = /^stories\/[a-f0-9-]{36}\.(jpg|png|webp|gif|avif)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const path = key.join("/");

  // Only serve objects that our upload routes created
  const ext = path.split(".").pop() ?? "";
  if (!RE.test(path) || !(ext in EXT_TYPES)) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await getObjectBytes(path);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body as unknown as BodyInit, {
    headers: {
      // Serve by extension, never the stored Content-Type: storage lets
      // presigned clients overwrite the type, so stored metadata is untrusted.
      "Content-Type": EXT_TYPES[ext],
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
