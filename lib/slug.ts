/**
 * Editorial slugs: lowercase, hyphenated, no punctuation. Applied on every
 * create and edit so URLs stay short, ASCII and — above all — stable.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // fold accents: é → e
    .replace(/[^a-z0-9\s-]/g, "") // drop special characters (: ? ! …)
    .replace(/\s+/g, "-") // whitespace → hyphen
    .replace(/-+/g, "-") // collapse repeats
    .replace(/^-+|-+$/g, ""); // trim edge hyphens
}
