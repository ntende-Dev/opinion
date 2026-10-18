import { cache } from "react";
import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { EDITORS } from "@/lib/roles";

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
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  authorName: string;
};

const loadStory = cache(async (slug: string): Promise<StoryRow | null> => {
  const [row] = await db
    .select({
      title: stories.title,
      excerpt: stories.excerpt,
      content: stories.content,
      coverImage: stories.coverImage,
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

  return (
    <div className="container font-body">
      {story.status !== "published" && (
        <div className="mb-8 px-6 py-3 bg-[var(--color-accent)] text-white text-sm font-ui font-medium">
          Preview — this story is <b>{story.status}</b>, not yet public.
        </div>
      )}
      <article className="measure">
        {story.coverImage && (
          <img
            src={story.coverImage}
            alt={`Cover for ${story.title}`}
            className="mb-8 w-full rounded border border-[var(--color-line)]"
          />
        )}
        <header className="mb-8">
          <h1 className="font-display">{story.title}</h1>
          <p className="mt-4 font-ui text-sm text-[var(--color-muted)]">
            {story.status !== "published" ? (
              story.status
            ) : (
              <>
                {story.authorName && (
                  <>
                    By {story.authorName}
                    <span className="mx-2 text-[var(--color-line)]">
                      —
                    </span>
                  </>
                )}
                {date ? dateline(date) : "Published"}
              </>
            )}
          </p>
        </header>
        <hr className="mb-8 border-[var(--color-line)]" />
        <div
          className="prose-content leading-relaxed"
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
      </article>
    </div>
  );
}
