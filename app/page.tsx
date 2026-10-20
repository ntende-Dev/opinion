import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import HeroFigure from "@/app/HeroFigure";
import StoryGrid from "@/app/StoryGrid";
import RevealGrid from "@/app/RevealGrid";
import SmoothHashLink from "@/app/SmoothHashLink";
import { HERO_MAX_COVERS, type HeroCover } from "@/app/heroCovers";
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
      coverFocalX: stories.coverFocalX,
      coverFocalY: stories.coverFocalY,
      authorName: users.name,
      publishedAt: stories.publishedAt,
      createdAt: stories.createdAt,
    })
    .from(stories)
    .leftJoin(users, eq(users.id, stories.authorId))
    .where(eq(stories.status, "published"))
    .orderBy(stories.id);

  // The hero loops the first five published stories that have a cover. The
  // cap is the brief's: five images, five seconds each.
  const covers: HeroCover[] = published
    .flatMap((story) =>
      story.coverImage
        ? [
            {
              slug: story.slug,
              title: story.title,
              coverImage: story.coverImage,
              focalX: story.coverFocalX,
              focalY: story.coverFocalY,
            },
          ]
        : [],
    )
    .slice(0, HERO_MAX_COVERS);

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
              <SmoothHashLink href="#latest" className={styles.primaryCta}>
                Read the latest
              </SmoothHashLink>
              <Link href="/signup" className={styles.secondaryCta}>
                Write for us
              </Link>
            </div>
          </div>
          <HeroFigure covers={covers} />
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
              each card opens the story's own page. RevealGrid lets them rise
              row by row as the section scrolls into view. */}
          <RevealGrid>
            <StoryGrid stories={published} />
          </RevealGrid>
        </section>
      )}
    </div>
  );
}
