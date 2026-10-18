/**
 * Client-side image upload: authorize → PUT straight to the bucket.
 * Returns the /api/images/<key> URL. Throws Error on failure so callers
 * choose the presentation (toast, inline error, ...).
 */
export async function uploadImage(file: File): Promise<string> {
  const authorize = await fetch("/api/upload/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  if (!authorize.ok) {
    const err = (await authorize.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Could not start the image upload");
  }

  const { uploadUrl, key } = (await authorize.json()) as {
    uploadUrl: string;
    key: string;
  };

  // The presigned grant expires in 60s; the PUT must start promptly.
  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) {
    throw new Error("The image upload failed — please try again");
  }
  return `/api/images/${key}`;
}
