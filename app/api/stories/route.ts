import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const authorId = (session.user as any).id;
  const { title, slug, excerpt, content, coverImage } = (await req.json()) as {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
  };

  if (!title || !slug) {
    return Response.json({ error: "title and slug are required" }, { status: 400 });
  }
  if (coverImage && !coverImage.startsWith("/api/images/")) {
    return Response.json({ error: "Invalid cover image" }, { status: 400 });
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
        authorId: Number(authorId),
        createdAt: new Date().toISOString(),
      })
      .returning();

    return Response.json(row);
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Could not create story" }, { status: 400 });
  }
}
