import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { EDITORS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Story({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.slug, slug));
  if (!story) notFound();

  if (story.status !== "published") {
    const session = await auth();
    const canPreview = !!session && (
      EDITORS.includes((session.user as any).role) ||
      String(story.authorId) === (session.user as any).id
    );
    if (!canPreview) notFound();
  }

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
          <p className="mt-4 text-muted font-ui text-sm">
            {story.status !== "published" ? story.status : "Published"}
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
