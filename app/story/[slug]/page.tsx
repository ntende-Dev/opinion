import { cache } from "react";
import Link from "next/link";
import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { and, eq, ne } from "drizzle-orm";
import { EDITORS } from "@/lib/roles";
import { sectionById, type SectionId } from "@/lib/sections";
import { cardColumns, newestFirst } from "@/lib/stories";
import { objectPosition } from "@/lib/focal";
import s from "@/app/Story.module.scss";
import StoryGrid from "@/app/StoryGrid";
import ReadingProgress from "@/app/ReadingProgress";
import SmoothHashLink from "@/app/SmoothHashLink";

export const dynamic = "force-dynamic";

/** Decode a URL slug, tolerating stray % sequences. */
function safeDecode(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

type StoryRow = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  section: string | null;
  coverImage: string | null;
  coverFocalX: number;
  coverFocalY: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  authorName: string;
};

const loadStory = cache(async (slug: string): Promise<StoryRow | null> => {
  const [row] = await db
    .select({
      id: stories.id,
      title: stories.title,
      excerpt: stories.excerpt,
      content: stories.content,
      section: stories.section,
      coverImage: stories.coverImage,
      coverFocalX: stories.coverFocalX,
      coverFocalY: stories.coverFocalY,
      status: stories.status,
      publishedAt: stories.publishedAt,
      createdAt: stories.createdAt,
      authorName: users.name,
    })
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(eq(stories.slug, slug));
  return row ?? null;
});

/**
 * The furniture under the argument: up to two more filings from the same
 * desk, newest first. A desk with nothing else in print falls back to the
 * rest of the paper, so the slot never prints an empty frame — and a paper
 * this small never prints "related" stories that aren't there.
 */
const loadRelated = cache(
  async (section: string | null, excludeId: number) => {
    const base = db
      .select(cardColumns)
      .from(stories)
      .leftJoin(users, eq(users.id, stories.authorId));

    if (section) {
      const sameDesk = await base
        .where(
          and(
            eq(stories.status, "published"),
            eq(stories.section, section),
            ne(stories.id, excludeId),
          ),
        )
        .orderBy(newestFirst)
        .limit(2);
      if (sameDesk.length > 0) {
        return { desk: sectionById(section as SectionId), stories: sameDesk };
      }
    }

    const elsewhere = await base
      .where(
        and(eq(stories.status, "published"), ne(stories.id, excludeId)),
      )
      .orderBy(newestFirst)
      .limit(2);
    return { desk: null, stories: elsewhere };
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) return { title: "Story not found" };
  const isPublic = story.status === "published";
  return {
    title: story.title,
    description: story.excerpt || story.content.slice(0, 150) || story.title,
    robots: isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: story.title,
      description: story.excerpt || story.title,
      ...(story.publishedAt ? { publishedTime: story.publishedAt } : {}),
      ...(story.coverImage ? { images: [story.coverImage] } : {}),
    },
  };
}

function dateline(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Johannesburg",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default async function Story({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  // Legacy URLs may carry percent-encoded characters (spaces etc.).
  const slug = safeDecode(raw);
  if (!slug) notFound();
  const story = await loadStory(slug);
  if (!story) notFound();

  if (story.status !== "published") {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const [row] = await db
      .select({ authorId: stories.authorId })
      .from(stories)
      .where(eq(stories.slug, slug));
    const canPreview =
      !!userId &&
      (EDITORS.includes((session!.user as any).role) ||
        String(row?.authorId ?? "") === String(userId));
    if (!canPreview) notFound();
  }

  const date = story.publishedAt || story.createdAt;
  // Empty when the stored timestamp cannot be formatted — the byline then
  // carries the author alone rather than a stranded "Published".
  const when = date ? dateline(date) : "";
  const desk = story.section
    ? sectionById(story.section as SectionId)
    : undefined;
  const related = await loadRelated(story.section, story.id);

  return (
    <div className="container font-body">
      {/* How far through the piece the reader has come. */}
      <ReadingProgress />
      {story.status !== "published" && (
        <div className={`${s.preview} measure-center font-ui`}>
          Preview — this story is <b>{story.status}</b>, not yet public.
        </div>
      )}
      <article className="measure-center">
        {story.coverImage && (
          <img
            src={story.coverImage}
            alt={`Cover for ${story.title}`}
            style={{
              objectPosition: objectPosition(
                story.coverFocalX,
                story.coverFocalY,
              ),
            }}
            className={s.cover}
          />
        )}
        <header className={s.head}>
          {desk && (
            <p className={`${s.kicker} font-ui`}>
              <Link href={`/section/${desk.id}`}>{desk.name}</Link>
            </p>
          )}
          <h1 className="font-display">{story.title}</h1>
          <p className={`${s.byline} font-ui`}>
            {story.status !== "published" ? (
              story.status
            ) : (
              <>
                {story.authorName && (
                  <span className={s.author}>By {story.authorName}</span>
                )}
                {when && <span className={s.dateline}>{when}</span>}
              </>
            )}
          </p>
        </header>
        <hr className={s.rule} />
        <div
          className={`${s.content} prose-content`}
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
        {/* The piece ends here: the rule closes the argument, and the link
            returns the reader to #main — the same target as the skip link, so
            the return works before JavaScript and lands focus at the top. */}
        <p className={s.endnote} data-print="hide">
          <SmoothHashLink
            href="#main"
            className={s.backToTop}
            focusTarget
          >
            Back to top
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </SmoothHashLink>
        </p>
      </article>

      {/* The desk the reader has just left, or the paper around it. */}
      {related.stories.length > 0 && (
        <aside className={s.related} aria-label="Related stories">
          <h2 className={`${s.relatedTitle} font-display`}>
            {related.desk
              ? `More from ${related.desk.name}`
              : "Elsewhere in the paper"}
          </h2>
          <StoryGrid stories={related.stories} />
        </aside>
      )}
    </div>
  );
}
