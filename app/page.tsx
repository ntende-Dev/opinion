import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

  return (
    <div className="container font-body">
      <header className="mb-12 measure">
        <h1 className="font-display">The Opinion Weekly</h1>
        <p className="mt-3 text-lead">
          Where every opinion matters. A journal of editorial argument.
        </p>
      </header>

      {published.length === 0 ? (
        <section className="mb-12 measure">
          <h2 className="font-display mb-4">No published stories yet.</h2>
          <p className="text-muted">
            The editorial inbox is open. Check back as contributors submit and
            editors publish.
          </p>
        </section>
      ) : (
        <section className="mb-12 measure space-y-8">
          <h2 className="font-display mb-6 font-semibold">Latest</h2>
          <ul>
            {published.map((s) => (
              <li key={s.id} className="pb-6 border-b border-[var(--color-line)] last:border-0">
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
        </section>
      )}
    </div>
  );
}
