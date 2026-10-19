#!/usr/bin/env node
/**
 * List the quote cards in Object Storage, with the URL the site serves each
 * one from.
 *
 *   node --env-file=../.env scripts/list-cards.mjs
 *
 * Read-only: it lists, it never writes or deletes. Cards are grouped by story
 * slug, because that is how the site looks them up.
 */
import { BUCKET, CARD_PREFIX, createS3, linksAreLocal, publicUrl } from "./storage.mjs";

const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

/** Every object under the prefix, following the listing's continuation token. */
async function listCards(s3) {
  const objects = [];
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: CARD_PREFIX,
        ContinuationToken: token,
      }),
    );
    objects.push(...(page.Contents ?? []));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

const size = (bytes) => `${(bytes / 1e6).toFixed(2)} MB`;
const when = (date) =>
  date
    ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date)
    : "";

const label = { vertical: "vertical (9:16)", square: "square (1:1)" };

const s3 = await createS3();
const objects = await listCards(s3);

if (objects.length === 0) {
  console.log(`\n  ${CARD_PREFIX} — nothing uploaded yet\n`);
  console.log("  Render and upload one with:");
  console.log("    npm run render:story -- --story <slug> --upload");
  console.log("    npm run render:story -- --story <slug> --format square --upload\n");
  process.exit(0);
}

// Group by slug: `<slug>.<format>.mp4` is the only shape the media route serves.
const bySlug = new Map();
for (const object of objects.sort((a, b) => a.Key.localeCompare(b.Key))) {
  const name = object.Key.slice(CARD_PREFIX.length).replace(/\.mp4$/, "");
  const match = /^(.*)\.(vertical|square)$/.exec(name);
  const slug = match ? match[1] : name;
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push({
    format: match ? match[2] : null,
    key: object.Key,
    bytes: object.Size ?? 0,
    modified: object.LastModified,
  });
}

const total = objects.reduce((sum, object) => sum + (object.Size ?? 0), 0);
console.log(`\n  ${CARD_PREFIX} — ${bySlug.size} story(s), ${objects.length} object(s), ${size(total)}\n`);

let served = 0;

for (const [slug, cards] of bySlug) {
  console.log(`  ${slug}`);
  for (const card of cards) {
    if (!card.format) {
      console.log(
        `    ${"NOT SERVED (unexpected name)".padEnd(22)} ${size(card.bytes).padStart(9)}  ${when(card.modified)}`,
      );
      console.log("      rename it to <slug>.vertical.mp4 or <slug>.square.mp4 for the site to serve it");
      continue;
    }
    served += 1;
    console.log(
      `    ${label[card.format].padEnd(22)} ${size(card.bytes).padStart(9)}  ${when(card.modified)}`,
    );
    console.log(`      ${publicUrl(card.key)}`);
  }
  console.log("");
}

if (served > 0 && linksAreLocal()) {
  console.log("  those links show this machine's dev host — set");
  console.log("  SITE_URL=https://www.opinionweekly.co.za in .env for the live ones.\n");
}
