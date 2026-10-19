import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.AWS_ENDPOINT_URL_S3!;
const region = process.env.AWS_REGION!;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;

export const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

export const BUCKET_NAME = "assets";

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Reverse of IMAGE_TYPES: serving decided by key extension, never by stored metadata. */
export const EXT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_TYPES).map(([mime, ext]) => [ext, mime]),
);

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

/** Store an image and return the path of our proxy URL (/api/images/<key>). */
export async function putObject(file: File): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  const key = `stories/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: bytes,
      ContentType: file.type,
    }),
  );
  return `/api/images/${key}`;
}

/**
 * Mint a short-lived presigned PUT so the browser can stream the file
 * straight to Object Storage. The ContentType baked into the signature
 * means the client MUST send the same Content-Type header.
 */
export async function presignUpload(contentType: string): Promise<{ key: string; uploadUrl: string; expiresIn: number }> {
  const ext = IMAGE_TYPES[contentType];
  const key = `stories/${crypto.randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const expiresIn = 60;
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { key, uploadUrl, expiresIn };
}

export async function getObjectBytes(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );
    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes) return null;
    return { body: bytes, contentType: obj.ContentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/**
 * Existence and size of an object, so a page can ask "has a card been made for
 * this story?" without pulling the file down.
 */
export async function headObject(key: string): Promise<{ contentLength: number } | null> {
  try {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );
    return { contentLength: head.ContentLength ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Stream an object — or one byte range of it — for the media proxy. Video
 * players cannot seek without range responses, and Safari will not start
 * playback at all.
 */
export async function getObjectStream(
  key: string,
  range?: { start: number; end: number },
): Promise<{ body: ReadableStream<Uint8Array>; contentLength: number } | null> {
  try {
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Range: range ? `bytes=${range.start}-${range.end}` : undefined,
      }),
    );
    const body = obj.Body?.transformToWebStream();
    if (!body) return null;
    return {
      body: body as ReadableStream<Uint8Array>,
      contentLength: obj.ContentLength ?? 0,
    };
  } catch {
    return null;
  }
}
