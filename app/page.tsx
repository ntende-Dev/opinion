import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import StoryGrid from "@/app/StoryGrid";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

function dateline() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}

export default async function Home() {
  const published = await db
    .select({
      id: stories.id,
      title: stories.title,
      slug: stories.slug,
      excerpt: stories.excerpt,
      coverImage: stories.coverImage,
      authorName: users.name,
      publishedAt: stories.publishedAt,
      createdAt: stories.createdAt,
      content: stories.content,
    })
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(eq(stories.status, "published"))
    .orderBy(stories.id);

  const [featured] = published;
  const heroImage = featured?.coverImage ?? null;

  return (
    <div className="container font-body">
      {/* Hero — typography left, masthead image right, per DESIGN.md */}
      <section className={styles.hero}>
        <p className={`${styles.dateline} font-ui`}>
          {dateline()} — the week&apos;s provocation
        </p>
        <div className={styles.heroGrid}>
          <div>
            <h1 className={`${styles.headline} font-display`}>
              Where every
              <br />
              opinion matters
              <span className={styles.headlineStop}>.</span>
            </h1>
            <p className={`${styles.lead} text-lead`}>
              A journal of editorial argument — essays, rebuttals and dispatches
              from people willing to commit to a position.
            </p>
            <div className={styles.actions}>
              <a href="#latest" className={styles.primaryCta}>
                Read the latest
              </a>
              <Link href="/signup" className={styles.secondaryCta}>
                Write for us
              </Link>
            </div>
          </div>
          <figure className={styles.heroFigure}>
            {heroImage ? (
              <Link href={`/story/${featured.slug}`} className={styles.heroLink}>
                <img
                  src={heroImage}
                  alt={`Cover of ${featured.title}`}
                  fetchPriority="high"
                  className={styles.heroImage}
                />
              </Link>
            ) : (
              <img
                src="/hero-emblem.svg"
                alt="The Opinion Weekly masthead emblem"
                fetchPriority="high"
                className={styles.heroImage}
              />
            )}
          </figure>
        </div>
      </section>

      {published.length === 0 ? (
        <section className={`${styles.emptyState} measure-center`}>
          <h2 className={`${styles.emptyTitle} font-display`}>
            No published stories yet.
          </h2>
          <p className="text-muted">
            The editorial inbox is open. Check back as contributors submit and
            editors publish.
          </p>
        </section>
      ) : (
        <section className={styles.latest} id="latest">
          <h2 className={`${styles.latestTitle} font-display`}>Latest</h2>
          {/* Front-page story cards — 2-up side by side, stacked on mobile;
              click opens the story in a modal */}
          <StoryGrid stories={published} />
        </section>
      )}
    </div>
  );
}
