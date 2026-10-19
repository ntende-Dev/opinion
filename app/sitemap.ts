import type { MetadataRoute } from "next";
import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...published.map((s) => ({
      url: `${base}/story/${s.slug}`,
      ...(s.publishedAt ? { lastModified: new Date(s.publishedAt) } : {}),
    })),
  ];
}
