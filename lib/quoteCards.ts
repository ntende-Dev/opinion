import { slugify } from "@/lib/slug";

/**
 * Where a story's rendered quote card lives in Object Storage, and how the
 * site finds it again.
 *
 * The key is derived, never stored: `quote-cards/<slug>.<format>.mp4`. The
 * render script in `quote-cards/` writes exactly this shape (it slugifies the
 * same way, from `lib/slug.ts`), so the two agree without a database column.
 * Re-rendering a card overwrites its own key.
 */

export type QuoteCardFormat = "vertical" | "square";

/** The storage key for a story's card. */
export function quoteCardKey(slug: string, format: QuoteCardFormat = "vertical"): string {
  return `quote-cards/${slugify(slug)}.${format}.mp4`;
}

/**
 * Only the keys the render script can produce are served. Nothing else in the
 * bucket is reachable through the media route.
 */
export const QUOTE_CARD_KEY_RE =
  /^quote-cards\/[a-z0-9-]{1,120}\.(vertical|square)\.mp4$/;

/** The URL the media route serves, or null if the slug cannot form a key. */
export function quoteCardUrl(slug: string, format: QuoteCardFormat = "vertical"): string | null {
  const key = quoteCardKey(slug, format);
  return QUOTE_CARD_KEY_RE.test(key) ? `/api/media/${key}` : null;
}
