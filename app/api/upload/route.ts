import { auth } from "@/auth";
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  putObject,
} from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const file = (await req.formData()).get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (!IMAGE_TYPES[file.type]) {
    return Response.json(
      { error: "Only JPEG, PNG, WebP, GIF or AVIF images are allowed" },
      { status: 415 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Images are limited to 4MB" }, { status: 413 });
  }

  try {
    const url = await putObject(file);
    return Response.json({ url });
  } catch {
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
