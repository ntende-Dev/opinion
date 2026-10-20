/**
 * The hero's rotating covers.
 *
 * The server sends at most five stories with a cover; the Player turns them
 * into a five-second loop. Keeping the count and timing here keeps the server,
 * the composition and the player in agreement.
 */
export type HeroCover = {
  slug: string;
  title: string;
  coverImage: string;
};

export const HERO_MAX_COVERS = 5;
export const HERO_FPS = 30;
export const HERO_SLIDE_SECONDS = 5;
export const HERO_SLIDE_FRAMES = HERO_FPS * HERO_SLIDE_SECONDS;
export const HERO_FADE_FRAMES = 18; // 0.6s — the dissolve is part of the 5s turn.

/**
 * Which cover the link should point at, given the frame.
 *
 * During a dissolve the link hands over at the midpoint, when the incoming
 * cover becomes the dominant image. That keeps the click honest without
 * waiting for the loop's next frame.
 */
export function heroCoverIndexAt(frame: number, count: number) {
  return Math.floor((frame + HERO_FADE_FRAMES / 2) / HERO_SLIDE_FRAMES) % count;
}
