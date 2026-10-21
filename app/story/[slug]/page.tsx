import { cache } from "react";
import Link from "next/link";
import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { and, eq, ne } from "drizzle-orm";
import { EDITORS } from "@/lib/roles";
import { sectionById, type SectionId } from "@/lib/sections";
import { slugify } from "@/lib/slug";
import { cardColumns, newestFirst } from "@/lib/stories";
import { objectPosition } from "@/lib/focal";
import s from "@/app/Story.module.scss";
import StoryGrid from "@/app/StoryGrid";
import ReadingProgress from "@/app/ReadingProgress";
import SmoothHashLink from "@/app/SmoothHashLink";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

/** Decode a URL slug, tolerating stray % sequences. */
function safeDecode(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/**
 * How long the piece reads, in minutes: the body's words over a reading pace
 * of 200 a minute — the Newspapers' Association measure and a fair pace for
 * argument rather than fiction. At least one: a very short filing should not
 * print "a 0-minute read".
 */
function readingMinutes(html: string) {
  const words = html
    .replace(/<[^>]*>/g, " ") // the content is editor-sanitised HTML
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type StoryRow = {
  id: number;
  title: string;
  slug: string;
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
      slug: stories.slug,
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

  // The reading beat, published pages only: a preview carries the status
  // alone rather than encouraging anyone to time an unread piece.
  const minutes =
    story.status === "published" ? readingMinutes(story.content) : 0;

  // The piece, as the indexers read it — NewsArticle per schema.org, emitted
  // from the server render and escaped against `</script>` injection. A
  // preview page never prints it: it is noindex anyway.
  const jsonLd =
    story.status !== "published"
      ? null
      : {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: story.title,
          ...(story.excerpt ? { description: story.excerpt } : {}),
          ...(story.coverImage
            ? {
                image: [new URL(story.coverImage, `${siteUrl}/`).href],
              }
            : {}),
          datePublished: date,
          dateModified: story.publishedAt || date,
          ...(story.authorName
            ? {
                author: [
                  {
                    "@type": "Person",
                    name: story.authorName,
                    url: `${siteUrl}/by/${slugify(story.authorName)}`,
                  },
                ],
              }
            : {}),
          ...(desk ? { articleSection: desk.name } : {}),
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${siteUrl}/story/${story.slug}`,
          },
          isAccessibleForFree: true,
          inLanguage: "en",
          publisher: {
            "@type": "Organization",
            name: "The Opinion Weekly",
          },
        };

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
                  <span className={s.author}>
                    By{" "}
                    <Link href={`/by/${slugify(story.authorName)}`}>
                      {story.authorName}
                    </Link>
                  </span>
                )}
                {when && <span className={s.dateline}>{when}</span>}
                {minutes >= 1 && (
                  <span className={s.readTime}>
                    A {minutes}-minute read
                  </span>
                )}
              </>
            )}
          </p>
        </header>
        <hr className={s.rule} />
        <div
          className={`${s.content} prose-content`}
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
          />
        )}
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
