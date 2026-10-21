import type { MetadataRoute } from "next";
import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/slug";
import { sectionsInPrint } from "@/lib/stories";

const base = process.env.NEXTAUTH_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A transient database drop must never fail the deploy — fall back to the
  // static pages so the build always produces a valid sitemap.
  let published: { slug: string; publishedAt: string | null }[] = [];
  try {
    published = await db
      .select({ slug: stories.slug, publishedAt: stories.publishedAt })
      .from(stories)
      .where(eq(stories.status, "published"));
  } catch (e) {
    console.error("sitemap: story query failed, publishing static entries", e);
  }

  // The bylines with something in print — each has a real /by page.
  const bylines: { name: string }[] = [];
  try {
    bylines.push(
      ...((await db
        .selectDistinct({ name: users.name })
        .from(stories)
        .innerJoin(users, eq(users.id, stories.authorId))
        .where(eq(stories.status, "published"))) as { name: string }[]),
    );
  } catch (e) {
    console.error("sitemap: byline query failed, skipping bylines", e);
  }

  // Only the desks with something printed: an empty section page is noindex,
  // so listing it here would contradict itself.
  const sections = await sectionsInPrint();

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...bylines.map((byline) => ({
      url: `${base}/by/${slugify(byline.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...sections.map((section) => ({
      url: `${base}/section/${section}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...published.map((s) => ({
      url: `${base}/story/${s.slug}`,
      ...(s.publishedAt ? { lastModified: new Date(s.publishedAt) } : {}),
    })),
  ];
}
