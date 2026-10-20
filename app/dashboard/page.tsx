import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import SubmitButton from "./SubmitButton";
import ProfileCard from "./ProfileCard";
import ManageStories from "./ManageStories";
import { EDITORS, type Status } from "@/lib/roles";
import d from "./Dashboard.module.scss";
import c from "./Chip.module.scss";

export const dynamic = "force-dynamic";

const badge: Record<Status, string> = {
  draft: c.draft,
  pending: c.pending,
  published: c.published,
};

export default async function MyStories() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isEditor = EDITORS.includes(role);
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

  // Admins and editors manage every story in the system — published ones
  // included — from this dashboard.
  const allRaw: {
    id: number;
    title: string;
    slug: string;
    status: string;
    authorName: string | null;
  }[] = isEditor
    ? await db
        .select({
          id: stories.id,
          title: stories.title,
          slug: stories.slug,
          status: stories.status,
          authorName: users.name,
        })
        .from(stories)
        .leftJoin(users, eq(users.id, stories.authorId))
        .orderBy(desc(stories.createdAt))
    : [];
  const all = allRaw.map((r) => ({ ...r, status: r.status as Status }));

  return (
    // The whole page sits on the paper's measure — profile card, the story
    // list and the editors' management rows all share one right edge, as on
    // the write, admin, messages and review pages.
    <div className="font-body measure">
      <ProfileCard />
      <h1 className={`${d.title} font-display`}>My stories</h1>
      {mine.length === 0 && (
        <p className={`${d.empty} text-muted`}>
          You haven't written any stories yet.{" "}
          <a href="/dashboard/write" className={d.link}>
            Start writing
          </a>
          .
        </p>
      )}
      <ul className={d.list}>
        {mine.map((s) => (
          <li key={s.id} className={d.item}>
            <div className={d.itemHead}>
              <div>
                <a
                  href={`/story/${s.slug}`}
                  className={`${d.itemTitle} font-display`}
                >
                  {s.title}
                </a>
                <div className={d.itemMeta}>
                  <span
                    className={`${c.chip} ${c.chipFlex} ${badge[s.status]}`}
                  >
                    {s.status}
                  </span>
                  {s.status === "draft" && s.reviewNote && (
                    <span className={`${d.note} font-ui`}>
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
      {isEditor && (
        <section className={d.section}>
          <h2 className={`${d.sectionTitle} font-display`}>
            All stories
          </h2>
          <p className={`${d.sectionIntro} text-muted`}>
            Every story in the system — published, pending or draft. Admin and
            editor tools: edit, publish/unpublish, delete.
          </p>
          <ManageStories rows={all} />
        </section>
      )}
    </div>
  );
}
