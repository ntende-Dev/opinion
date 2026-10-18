import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EDITORS } from "@/lib/roles";
import ReviewActions from "../ReviewActions";

export const dynamic = "force-dynamic";

export default async function ReviewQueue() {
  const session = await auth();
  if (!EDITORS.includes((session?.user as any)?.role)) redirect("/dashboard");

  const pending = await db
    .select({
      id: stories.id,
      title: stories.title,
      slug: stories.slug,
      excerpt: stories.excerpt,
      author: users.name,
      submittedAt: stories.createdAt,
    })
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(eq(stories.status, "pending"))
    .orderBy(desc(stories.createdAt));

  return (
    <div className="font-body">
      <h1 className="font-display mb-6">
        Pending review <span className="font-normal text-[var(--color-muted)]">({pending.length})</span>
      </h1>
      {pending.length === 0 && (
        <p className="text-muted measure mb-10">
          🎉 Inbox Zero — nothing awaiting review.
        </p>
      )}
      {pending.map((s) => (
        <div key={s.id} className="border-b border-[var(--color-line)] pb-8 last:border-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">{s.title}</h2>
              <ReviewActions id={s.id} />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted font-ui">
            by {s.author ?? "unknown"} &nbsp;·&nbsp;
            {new Date(s.submittedAt!).toLocaleString()}
          </p>
          <p className="mt-4 leading-relaxed">{s.excerpt}</p>
          <a
            href={`/story/${s.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-ui underline underline-offset-2 hover:no-underline"
          >
            Read full story
          </a>
        </div>
      ))}
    </div>
  );
}
