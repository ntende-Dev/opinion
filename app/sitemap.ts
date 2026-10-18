import type { MetadataRoute } from "next";
import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const base = process.env.NEXTAUTH_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await db
    .select({ slug: stories.slug, publishedAt: stories.publishedAt })
    .from(stories)
    .where(eq(stories.status, "published"));

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 },
    ...published.map((s) => ({
      url: `${base}/story/${s.slug}`,
      ...(s.publishedAt ? { lastModified: new Date(s.publishedAt) } : {}),
    })),
  ];
}
