import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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
    })
    .from(stories)
    .where(eq(stories.status, "published"))
    .orderBy(stories.id);

  const [featured, ...rest] = published;

  return (
    <div className="container font-body">
      {/* Hero — typography only, per DESIGN.md */}
      <section className="measure mt-6 mb-14">
        <p className="font-ui text-sm text-[var(--color-muted)] border-t border-[var(--color-line)] pt-3">
          {dateline()} — the week&apos;s provocation
        </p>
        <h1 className="font-display font-bold mt-4 text-[clamp(2.4rem,7.5vw,3.4rem)] leading-[1.08] tracking-[-0.02em]">
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
        <section className="mb-12 measure" id="latest">
          <h2 className="font-display font-semibold mb-8 text-[var(--step-2)]">
            Latest
          </h2>
          {/* Featured argument runs large; the rest stay as list rows */}
          <article className="pb-8 mb-2 border-b border-[var(--color-line)]">
            <a
              href={`/story/${featured.slug}`}
              className="font-display font-bold no-underline hover:underline text-[var(--step-3)] leading-[1.15] block"
            >
              {featured.title}
            </a>
            {featured.excerpt && (
              <p className="mt-3 max-w-[58ch] text-[var(--step-1)] leading-relaxed">
                {featured.excerpt}
              </p>
            )}
            {featured.coverImage && (
              <img
                src={featured.coverImage}
                alt=""
                className="mt-5 w-full aspect-[16/9] object-cover rounded border border-[var(--color-line)]"
              />
            )}
          </article>
          {rest.length > 0 && (
            <ul className="mt-6">
              {rest.map((s) => (
                <li
                  key={s.id}
                  className="pb-6 border-b border-[var(--color-line)] last:border-0"
                >
                  <div className="flex items-start gap-4">
                    {s.coverImage && (
                      <img
                        src={s.coverImage}
                        alt=""
                        className="hidden sm:block h-20 w-28 object-cover rounded border border-[var(--color-line)] shrink-0"
                      />
                    )}
                    <div>
                      <a
                        href={`/story/${s.slug}`}
                        className="font-display font-bold no-underline hover:underline"
                      >
                        {s.title}
                      </a>
                      {s.excerpt && (
                        <p className="mt-2 text-sm text-muted leading-relaxed">
                          {s.excerpt}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

