import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { auth } from "@/auth";
import { and, eq, ne } from "drizzle-orm";
import { EDITORS, type Status } from "@/lib/roles";

const OWNER_MOVES: Record<Status, Status[]> = {
  draft: ["pending"],
  pending: [],
  published: [],
};
const EDITOR_MOVES: Record<Status, Status[]> = {
  draft: ["pending", "published"],
  pending: ["draft", "published"],
  published: ["draft", "published"],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId))
    return Response.json({ error: "Bad id" }, { status: 400 });

  // Egress: gate on the smallest possible row — no story HTML over the wire
  const [story] = await db
    .select({
      authorId: stories.authorId,
      status: stories.status,
      reviewNote: stories.reviewNote,
      publishedAt: stories.publishedAt,
    })
    .from(stories)
    .where(eq(stories.id, storyId));
  if (!story) return Response.json({ error: "Not found" }, { status: 404 });

  const isEditor = EDITORS.includes((session.user as any).role);
  const isOwner = String(story.authorId) === (session.user as any).id;
  if (!isEditor && !isOwner)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const next = (await req.json()) as { status: Status; reviewNote?: string };
  const allowed = isEditor ? EDITOR_MOVES[story.status] : OWNER_MOVES[story.status];
  if (!allowed.includes(next.status))
    return Response.json(
      { error: `Cannot move ${story.status} → ${next.status}` },
      { status: 422 },
    );

  const [row] = await db
    .update(stories)
    .set({
      status: next.status,
      reviewNote:
        next.status === "published"
          ? null
          : next.status === "draft"
            ? next.reviewNote ?? null
            : story.reviewNote,
      publishedAt:
        next.status === "published" && story.status !== "published"
          ? new Date().toISOString()
          : story.publishedAt,
    })
    .where(eq(stories.id, storyId))
    .returning({
      id: stories.id,
      slug: stories.slug,
      status: stories.status,
      reviewNote: stories.reviewNote,
      publishedAt: stories.publishedAt,
    });

  return Response.json(row);
}

/** Load a full story — editors may open any story; an author only their own. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId))
    return Response.json({ error: "Bad id" }, { status: 400 });

  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story) return Response.json({ error: "Not found" }, { status: 404 });

  const isEditor = EDITORS.includes((session.user as any).role);
  const isOwner = String(story.authorId) === (session.user as any).id;
  if (!isEditor && !isOwner)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  return Response.json(story);
}

/** Full edit (title, slug, excerpt, content, cover). Editor-only privilege —
 *  admins and editors can revise any story, published ones included. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!EDITORS.includes((session.user as any).role))
    return Response.json(
      { error: "Only admins and editors can edit stories" },
      { status: 403 },
    );

  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId))
    return Response.json({ error: "Bad id" }, { status: 400 });

  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string | null;
  };

  if (!body.title || !body.title.trim() || !body.slug || !body.content)
    return Response.json(
      { error: "title, slug and content are required" },
      { status: 400 },
    );
  if (body.coverImage && !body.coverImage.startsWith("/api/images/"))
    return Response.json({ error: "Invalid cover image" }, { status: 400 });

  // Slug must stay unique across stories.
  const [clash] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.slug, body.slug), ne(stories.id, storyId)));
  if (clash)
    return Response.json(
      { error: "That slug is already in use by another story" },
      { status: 409 },
    );

  const [row] = await db
    .update(stories)
    .set({
      title: body.title.trim(),
      slug: body.slug,
      excerpt: body.excerpt ?? "",
      content: body.content,
      coverImage: body.coverImage ?? null,
    })
    .where(eq(stories.id, storyId))
    .returning({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      status: stories.status,
    });

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

/** Hard delete. Editor-only privilege — there is no undo. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!EDITORS.includes((session.user as any).role))
    return Response.json(
      { error: "Only admins and editors can delete stories" },
      { status: 403 },
    );

  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isInteger(storyId))
    return Response.json({ error: "Bad id" }, { status: 400 });

  await db.delete(stories).where(eq(stories.id, storyId));
  return Response.json({ ok: true });
}
