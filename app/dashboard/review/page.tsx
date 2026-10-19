import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EDITORS } from "@/lib/roles";
import ReviewActions from "../ReviewActions";
import r from "./Review.module.scss";

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
      <h1 className={`${r.title} font-display`}>
        Pending review <span className={r.count}>({pending.length})</span>
      </h1>
      {pending.length === 0 && (
        <p className={`${r.empty} text-muted measure`}>
          🎉 Inbox Zero — nothing awaiting review.
        </p>
      )}
      {pending.map((s) => (
        <div key={s.id} className={r.item}>
          <div className={r.head}>
            <div>
              <h2 className={`${r.storyTitle} font-display`}>{s.title}</h2>
              <ReviewActions id={s.id} />
            </div>
          </div>
          <p className={`${r.byline} text-muted font-ui`}>
            by {s.author ?? "unknown"} &nbsp;·&nbsp;
            {new Date(s.submittedAt!).toLocaleString()}
          </p>
          <p className={r.excerpt}>{s.excerpt}</p>
          <a
            href={`/story/${s.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${r.readLink} font-ui`}
          >
            Read full story
          </a>
        </div>
      ))}
    </div>
  );
}
