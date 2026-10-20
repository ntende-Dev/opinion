import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { SECTIONS, type SectionId } from "@/lib/sections";

/**
 * Exactly the columns a story card renders — one shape for the front page, a
 * section page and search results, so the same card prints everywhere.
 */
export const cardColumns = {
  id: stories.id,
  title: stories.title,
  slug: stories.slug,
  excerpt: stories.excerpt,
  coverImage: stories.coverImage,
  coverFocalX: stories.coverFocalX,
  coverFocalY: stories.coverFocalY,
  authorName: users.name,
  publishedAt: stories.publishedAt,
  createdAt: stories.createdAt,
};

/** Newest first. Both stamps are ISO text (which sorts correctly); created_at
 *  covers any row published without a stamp. */
const newestFirst = desc(
  sql`coalesce(${stories.publishedAt}, ${stories.createdAt})`,
);

/** Published stories, newest first — optionally just one desk's. */
export async function listPublishedStories(
  options: { section?: SectionId } = {},
) {
  const query = db
    .select(cardColumns)
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(
      options.section
        ? and(
            eq(stories.status, "published"),
            eq(stories.section, options.section),
          )
        : eq(stories.status, "published"),
    )
    .orderBy(newestFirst);

  return query;
}

/** `%` and `_` are wildcards in LIKE; a literal "50%" must not match the
 *  whole paper. The escaping backslash is LIKE's default escape character. */
function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Phrase search over the published paper. Words are ANDed — each one may land
 * in the title, the deck or the body — which gives a useful hit on a Vhembe
 * place name without a full-text index on a table this small.
 */
export async function searchPublishedStories(query: string, limit = 60) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map(escapeLike);
  if (!terms.length) return [];

  return db
    .select(cardColumns)
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(
      and(
        eq(stories.status, "published"),
        ...terms.map((term) =>
          or(
            ilike(stories.title, `%${term}%`),
            ilike(stories.excerpt, `%${term}%`),
            ilike(stories.content, `%${term}%`),
          ),
        ),
      ),
    )
    .orderBy(newestFirst)
    .limit(limit);
}

/**
 * The desks with at least one published story, in the paper's own order —
 * what the masthead's section row prints. A database hiccup must never take
 * the header down with it, so failure means "no sections", not an exception.
 */
export async function sectionsInPrint(): Promise<SectionId[]> {
  try {
    const rows = await db
      .selectDistinct({ section: stories.section })
      .from(stories)
      .where(eq(stories.status, "published"));

    const filed = new Set(rows.map((row) => row.section));
    return SECTIONS.filter((section) => filed.has(section.id)).map(
      (section) => section.id,
    );
  } catch (error) {
    console.error(
      "masthead: section query failed, printing no sections",
      error,
    );
    return [];
  }
}
