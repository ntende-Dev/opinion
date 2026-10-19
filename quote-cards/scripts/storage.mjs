/**
 * Object Storage plumbing shared by the scripts in this folder.
 *
 * The app talks to the same bucket through `lib/storage.ts`; this is the
 * command-line side of that, kept in one place so the client config (path-style
 * addressing, the region) cannot drift between scripts.
 */
export const BUCKET = process.env.S3_BUCKET ?? "assets";
export const CARD_PREFIX = "quote-cards/";

const REQUIRED = [
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

/**
 * A client for the bucket the site's media lives in. The SDK is imported here
 * rather than at the top of the file so a plain render never loads it.
 */
export async function createS3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `missing credentials: ${missing.join(", ")} — run with --env-file=../.env`,
    );
  }
  return new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

/**
 * The origin the printed links use. `SITE_URL` wins; otherwise the same
 * `NEXTAUTH_URL` the app itself builds its feed, sitemap and metadata from.
 */
export function siteBase() {
  return (process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
}

/** The URL the site serves an uploaded card from. */
export function publicUrl(key) {
  const base = siteBase();
  return `${base}/api/media/${key}`;
}

/** True when those links point at a dev host rather than the live site. */
export function linksAreLocal() {
  const base = siteBase();
  return base === "" || /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(base);
}
