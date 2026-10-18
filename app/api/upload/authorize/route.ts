import { auth } from "@/auth";
import { IMAGE_TYPES, presignUpload } from "@/lib/storage";

/** Step 1 of the presigned flow: authorize, then the browser PUTs directly to storage. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { contentType } = (await req.json().catch(() => ({}))) as { contentType?: string };
  if (!contentType || !IMAGE_TYPES[contentType]) {
    return Response.json(
      { error: "Only JPEG, PNG, WebP, GIF or AVIF images are allowed" },
      { status: 415 },
    );
  }

  try {
    const grant = await presignUpload(contentType);
    return Response.json(grant);
  } catch {
    return Response.json({ error: "Could not authorize upload" }, { status: 500 });
  }
}
