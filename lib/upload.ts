/** Client-side image upload: authorize → PUT straight to the bucket. Returns /api/images/<key>. */
export async function uploadImage(file: File): Promise<string | null> {
  const authorize = await fetch("/api/upload/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  if (!authorize.ok) {
    const err = (await authorize.json().catch(() => ({}))) as { error?: string };
    window.alert(err.error || "Could not start upload");
    return null;
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
    window.alert("Image upload failed");
    return null;
  }
  return `/api/images/${key}`;
}
