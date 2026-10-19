import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { isSectionId } from "@/lib/sections";
import { slugify } from "@/lib/slug";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const authorId = (session.user as any).id;
  const { title, slug: rawSlug, excerpt, content, coverImage, section } = (await req.json()) as {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    section?: string | null;
  };

  const slug = slugify(rawSlug ?? "");
  if (!title || !slug) {
    return Response.json(
      { error: "title and slug are required (and the slug needs usable characters)" },
      { status: 400 },
    );
  }
  if (coverImage && !coverImage.startsWith("/api/images/")) {
    return Response.json({ error: "Invalid cover image" }, { status: 400 });
  }
  if (section && !isSectionId(section)) {
    return Response.json({ error: "Unknown section" }, { status: 400 });
  }

  // Friendly duplicate-slug message instead of a raw database error.
  const [clash] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(eq(stories.slug, slug));
  if (clash) {
    return Response.json(
      { error: "That slug is already in use — pick another" },
      { status: 409 },
    );
  }

  try {
    const [row] = await db
      .insert(stories)
      .values({
        title,
        slug,
        excerpt: excerpt ?? "",
        content: content ?? "",
        coverImage,
        status: "draft",
        section: isSectionId(section) ? section : null,
        authorId: Number(authorId),
        createdAt: new Date().toISOString(),
      })
      .returning();

    return Response.json(row);
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Could not create story" }, { status: 400 });
  }
}
