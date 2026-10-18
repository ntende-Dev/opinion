import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
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
