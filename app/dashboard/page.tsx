import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import SubmitButton from "./SubmitButton";
import ProfileCard from "./ProfileCard";
import type { Status } from "@/lib/roles";

export const dynamic = "force-dynamic";

const badge: Record<Status, string> = {
  draft: "bg-gray-200 text-gray-700",
  pending: "bg-amber-200 text-amber-800",
  published: "bg-green-200 text-green-800",
};

export default async function MyStories() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const mine = await db
    .select({
      id: stories.id,
      title: stories.title,
      slug: stories.slug,
      status: stories.status,
      reviewNote: stories.reviewNote,
    })
    .from(stories)
    .where(eq(stories.authorId, Number(userId)))
    .orderBy(desc(stories.createdAt));

  return (
    <div className="font-body">
      <div className="measure">
        <ProfileCard />
      </div>
      <h1 className="font-display mb-6">My stories</h1>
      {mine.length === 0 && (
        <p className="text-muted measure mb-10">
          You haven't written any stories yet.{" "}
          <a href="/dashboard/write" className="underline underline-offset-2 hover:no-underline">
            Start writing
          </a>
          .
        </p>
      )}
      <ul className="space-y-6 measure">
        {mine.map((s) => (
          <li key={s.id} className="border-b border-[var(--color-line)] pb-6 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <a
                  href={`/story/${s.slug}`}
                  className="font-display font-bold hover:underline"
                >
                  {s.title}
                </a>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`font-sans inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${badge[s.status]}`}
                  >
                    {s.status}
                  </span>
                  {s.status === "draft" && s.reviewNote && (
                    <span className="text-xs text-[var(--color-accent)] font-ui font-medium">
                      Editor: {s.reviewNote}
                    </span>
                  )}
                </div>
              </div>
              {s.status === "draft" && <SubmitButton id={s.id} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
