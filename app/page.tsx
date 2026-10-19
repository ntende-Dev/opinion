import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import StoryCard from "@/app/StoryCard";

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
      <section className="mb-14">
        <p className="font-ui text-sm text-[var(--color-muted)] border-t border-[var(--color-line)] pt-3">
          {dateline()} — the week&apos;s provocation
        </p>
        <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div>
            <h1 className="font-display font-bold text-[clamp(2.4rem,7.5vw,3.4rem)] leading-[1.08] tracking-[-0.02em]">
              Where every
              <br />
              opinion matters
              <span className="text-[var(--color-accent)]">.</span>
            </h1>
            <p className="mt-5 text-lead max-w-[52ch]">
              A journal of editorial argument — essays, rebuttals and dispatches
              from people willing to commit to a position.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <a
                href="#latest"
                className="rounded bg-[var(--color-accent)] px-4 py-2 text-white font-ui font-medium no-underline hover:bg-[var(--color-accent-hover)] hover:text-white transition-colors"
              >
                Read the latest
              </a>
              <a
                href="/signup"
                className="rounded border border-[var(--color-line)] px-4 py-2 font-ui font-medium text-[var(--color-ink)] no-underline hover:border-[var(--color-muted)] transition-colors"
              >
                Write for us
              </a>
            </div>
          </div>
          <figure className="m-0 overflow-hidden rounded border border-[var(--color-line)] aspect-[16/10] lg:aspect-[4/5]">
            {heroImage ? (
              <a href={`/story/${featured.slug}`} className="block h-full">
                <img
                  src={heroImage}
                  alt={`Cover of ${featured.title}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ) : (
              <img
                src="/hero-emblem.svg"
                alt="The Opinion Weekly masthead emblem"
                className="h-full w-full object-cover"
              />
            )}
          </figure>
        </div>
      </section>

      {published.length === 0 ? (
        <section className="mb-12 measure">
          <h2 className="font-display mb-4">No published stories yet.</h2>
          <p className="text-muted">
            The editorial inbox is open. Check back as contributors submit and
            editors publish.
          </p>
        </section>
      ) : (
        <section className="mb-12" id="latest">
          <h2 className="font-display font-semibold mb-8 text-[var(--step-2)]">
            Latest
          </h2>
          {/* Front-page story cards — 2-up side by side, stacked on mobile;
              click opens the story in a modal */}
          <ul className="grid gap-5 sm:grid-cols-2 items-stretch">
            {published.map((s) => (
              <li key={s.id}>
                <StoryCard story={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

