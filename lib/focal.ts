/**
 * Cover focal points.
 *
 * A story's cover is cropped in three different frames — the hero (4:5 on
 * desktop, 16:10 on a phone), the 16:9 card and the 16:9 story page — so a
 * single percentage pair lets an editor choose the part of the picture those
 * crops keep. The value is stored per axis, 0–100, and turns directly into CSS
 * `object-position`.
 */
export const FOCAL_DEFAULT = 50;

/** Keep a stored or submitted focal value inside the usable range. */
export function clampFocal(value: unknown, fallback = FOCAL_DEFAULT): number {
  if (value === null || value === undefined || value === "") return fallback;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.min(100, Math.max(0, number)));
}

/** The CSS `object-position` for a stored focal pair. */
export function objectPosition(
  x?: number | null,
  y?: number | null,
): string {
  return `${clampFocal(x)}% ${clampFocal(y)}%`;
}
