import { db } from "@/drizzle/db";
import { stories, users } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { SITE } from "@/lib/site";

// Reads the database at request time; never blocked by a build-time outage.
export const dynamic = "force-dynamic";

const base = process.env.NEXTAUTH_URL || "http://localhost:3000";

function xml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * RSS 2.0 feed of everything published. Readers, aggregators and anyone who
 * wants the paper pushed to them — no account, no tracking.
 */
export async function GET() {
  let items: {
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: string | null;
    authorName: string | null;
  }[] = [];

  try {
    items = await db
      .select({
        title: stories.title,
        slug: stories.slug,
        excerpt: stories.excerpt,
        publishedAt: stories.publishedAt,
        authorName: users.name,
      })
      .from(stories)
      .leftJoin(users, eq(users.id, stories.authorId))
      .where(eq(stories.status, "published"))
      .orderBy(desc(stories.publishedAt));
  } catch (e) {
    console.error("feed: story query failed", e);
  }

  const entries = items
    .map((s) => {
      const url = `${base}/story/${s.slug}`;
      const date = s.publishedAt ? new Date(s.publishedAt).toUTCString() : "";
      const description = s.excerpt
        ? `<p>${xml(s.excerpt)}</p>`
        : `<p>${xml(s.title)}</p>`;
      const byline = s.authorName
        ? `<p><em>${xml(s.authorName)}</em></p>`
        : "";
      return `    <item>
      <title>${xml(s.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      ${date ? `<pubDate>${date}</pubDate>` : ""}
      <description><![CDATA[${description}${byline}]]></description>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(SITE.name)}</title>
    <link>${xml(base)}</link>
    <atom:link href="${xml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${xml(SITE.description)}</description>
    <language>en-ZA</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${entries}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
