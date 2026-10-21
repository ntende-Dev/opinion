import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { cardColumns, newestFirst } from "@/lib/stories";
import { slugify } from "@/lib/slug";
import StoryGrid from "@/app/StoryGrid";
import e from "@/app/Editorial.module.scss";
import s from "@/app/AuthorPage.module.scss";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

/** Decode a URL name, tolerating stray % sequences. */
function safeDecode(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * The masthead, one writer wide. The address is the writer's name slugified —
 * the same fold lib/slug.ts applies to story URLs — resolved against the
 * masthead table (a page's worth of rows), so accent-folding and casing stay
 * consistent with everywhere else the slug function runs.
 */
const mastheadBySlug = cache(async () => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users);
  const map = new Map(rows.map((row) => [slugify(row.name), row]));
  return map;
});

/** The writer's published filings, newest first — the same card shape. */
const loadFilings = cache(async (authorId: number) =>
  db
    .select(cardColumns)
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(
      and(eq(stories.status, "published"), eq(stories.authorId, authorId)),
    )
    .orderBy(newestFirst),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name: raw } = await params;
  const author = (await mastheadBySlug()).get(slugify(safeDecode(raw)));
  if (!author) return { title: "Byline not found" };
  return {
    title: author.name,
    description: `Published filings and argument by ${author.name} for The Opinion Weekly.`,
    alternates: { canonical: `/by/${slugify(author.name)}` },
    // A writer with nothing in print is a real page, but there is nothing
    // there yet worth putting in front of a search engine.
    ...(await loadFilings(author.id)).length
      ? {}
      : { robots: { index: false, follow: true } },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { name: raw } = await params;
  const author = (await mastheadBySlug()).get(slugify(safeDecode(raw)));
  if (!author) notFound();

  const filed = await loadFilings(author.id);
  const editor = author.role === "admin" || author.role === "editor";

  return (
    <div className="container font-body">
      <article className="measure-center">
        <p className={`${e.eyebrow} font-ui`}>
          {editor ? "Editor" : "Contributor"}
        </p>
        <header className={s.head}>
          {author.avatarUrl && (
            <img
              src={author.avatarUrl}
              alt=""
              width={72}
              height={72}
              className={s.avatar}
            />
          )}
          <div>
            <h1 className={`${s.name} font-display`}>{author.name}</h1>
            <p className={`${s.count} font-ui`}>
              {filed.length === 1
                ? "One filing in print"
                : `${filed.length} filings in print`}
            </p>
          </div>
        </header>
      </article>

      <div className="measure-center">
        <h2 className="visually-hidden">Stories filed by {author.name}</h2>
        {filed.length > 0 ? (
          <StoryGrid stories={filed} solo={filed.length === 1} />
        ) : (
          <p className={`${s.empty} font-body`}>
            Nothing in print from {author.name} yet —{" "}
            <Link href="/">the front page</Link> has the rest of the paper.
          </p>
        )}
      </div>
    </div>
  );
}
