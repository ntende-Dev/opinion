import { getObjectStream, headObject } from "@/lib/storage";
import { QUOTE_CARD_KEY_RE } from "@/lib/quoteCards";

/**
 * Serves rendered quote-card videos out of Object Storage.
 *
 * Kept separate from /api/images because video needs byte-range responses:
 * without them a player cannot seek, and Safari will not start playback at all.
 * Only the keys the render script writes are served, and the Content-Type is
 * decided by the key — never by the stored metadata, which a presigned client
 * could have set to anything.
 */

/** `bytes=start-end`, `bytes=start-`, `bytes=-suffix`. Anything else is ignored. */
function parseRange(header: string | null, total: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, from, to] = match;
  if (from === "" && to === "") return null;

  const suffix = from === "";
  const start = suffix ? Math.max(0, total - Number(to)) : Number(from);
  const end = suffix || to === "" ? total - 1 : Math.min(Number(to), total - 1);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || start > end) return null;
  return { start, end };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const path = key.join("/");
  if (!QUOTE_CARD_KEY_RE.test(path)) return new Response("Not found", { status: 404 });

  const head = await headObject(path);
  if (!head || head.contentLength <= 0) return new Response("Not found", { status: 404 });

  const range = parseRange(req.headers.get("range"), head.contentLength);
  const obj = await getObjectStream(path, range ?? undefined);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(obj.contentLength),
      "Accept-Ranges": "bytes",
      ...(range
        ? { "Content-Range": `bytes ${range.start}-${range.end}/${head.contentLength}` }
        : {}),
      // A re-render reuses the same key, so this copy is deliberately
      // short-lived rather than immutable the way the image route's is.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
