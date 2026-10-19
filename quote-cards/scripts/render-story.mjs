#!/usr/bin/env node
/**
 * Render a story's pull-quote as a social card — locally, on this machine —
 * and optionally upload the MP4 to the same Object Storage bucket the site's
 * images live in.
 *
 *   node --env-file=../.env scripts/render-story.mjs
 *   node --env-file=../.env scripts/render-story.mjs --story <slug|id> --format square
 *   node --env-file=../.env scripts/render-story.mjs --story <slug|id> --upload
 *
 * Nothing is uploaded unless --upload is passed. The render itself never
 * touches the database; only --story/--skip-render paths read it.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(projectRoot, "..");
const BUCKET = process.env.S3_BUCKET ?? "assets";

const FLAGS = new Set(["upload", "skip-render", "help", "h"]);

/** Same rule as lib/slug.ts in the app — both sides must agree on the key. */
function slugify(input = "") {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The URL the site serves the uploaded card from. */
function publicUrl(key) {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  return `${base}/api/media/${key}`;
}

function parseArgs(argv) {
  const out = { upload: false, skipRender: false };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [key, inline] = raw.slice(2).split("=");
    if (FLAGS.has(key)) {
      out[key === "h" ? "help" : key.replace("-r", "R")] = true;
      continue;
    }
    const value = inline ?? argv[++i];
    if (value === undefined) throw new Error(`--${key} needs a value`);
    out[key] = value;
  }
  return out;
}

const usage = `
Render a quote card for The Opinion Weekly.

  --story <slug|id>   story to pull the quote from (default: newest published)
  --format <f>        vertical (1080x1920, default) | square (1080x1080)
  --quote <text>      override the quote text
  --author <name>     override the byline
  --title <text>      override the story title
  --date <text>       override the display date
  --handle <text>     footer line (default: opinionweekly.co.za)
  --out <file>        output path (default: out/<story>-<format>.mp4)
  --upload            upload the MP4 to s3://${BUCKET}/quote-cards/
  --skip-render       skip rendering (use the existing file at --out)
`;

/** Story titles in the database arrive with stray runs of spaces. */
function tidy(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

/** Body text is markdown-ish; a pull-quote is the first real paragraph. */
function firstParagraph(content = "") {
  return (
    content
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/[*_`~]/g, "")
      .replace(/<[^>]+>/g, " ")
      .split(/\n{2,}/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .find((s) => s.length > 0) ?? ""
  );
}

/** Cut at the last sentence-ish boundary so the card never ends mid-word. */
function clipQuote(text, max = 240) {
  const clean = text.replace(/\s+/g, " ").trim().replace(/^[“"']+|[”"']+$/g, "");
  if (clean.length <= max) return clean;
  const window = clean.slice(0, max);
  const cut = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf("; "),
    window.lastIndexOf(", "),
    window.lastIndexOf(" "),
  );
  const body = (cut > 40 ? window.slice(0, cut) : window).replace(/[\s,;:.!?]+$/, "");
  return `${body}…`;
}

function displayDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

async function loadStory(selector) {
  const { default: pg } = await import("pg");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — pass --env-file=../.env");
  }
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const where = selector
      ? 's.slug = $1 OR s.id::text = $1'
      : "s.status = 'published'";
    const order = selector
      ? "s.slug = $1 DESC"
      : "s.published_at DESC NULLS LAST, s.id DESC";
    const { rows } = await client.query(
      `SELECT s.id, s.slug, s.title, s.excerpt, s.content, s.published_at, u.name AS author
         FROM stories s
         JOIN users u ON u.id = s."authorId"
        WHERE ${where}
        ORDER BY ${order}
        LIMIT 1`,
      selector ? [selector] : [],
    );
    if (rows.length === 0) throw new Error(`no story matched ${selector ?? "published stories"}`);
    return rows[0];
  } finally {
    await client.end();
  }
}

async function upload(file, key) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const required = ["AWS_ENDPOINT_URL_S3", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) throw new Error(`missing credentials: ${missing.join(", ")}`);

  const s3 = new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const body = readFileSync(file);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
    }),
  );

  // No share link is printed on purpose: the storage host answers every
  // browser-style GET with the Neon console page, signature or not, so a
  // presigned URL is not a viewable link. The object is read back with the
  // S3 API (or through an app route, once one exists for video).
  return { key, bytes: body.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(usage);

  const format = args.format === "square" ? "square" : "vertical";
  const composition = format === "square" ? "QuoteCardSquare" : "QuoteCard";

  let story = null;
  if (args.story || (!args.quote && !args.skipRender)) {
    story = await loadStory(args.story);
  }

  // The card is keyed by the story's slug — the same value the site looks it up
  // by — so a numeric --story still lands on the right key.
  const keySlug = slugify(story?.slug ?? "") || "sample";
  const slug = story?.slug ?? args.story ?? "sample";
  const quote =
    args.quote ??
    clipQuote(firstParagraph(story?.content) || story?.excerpt || "");
  const props = {
    quote,
    author: tidy(args.author ?? story?.author ?? "The Opinion Weekly"),
    title: tidy(args.title ?? story?.title ?? ""),
    date: args.date ?? displayDate(story?.published_at),
    handle: args.handle ?? "opinionweekly.co.za",
    format,
  };

  const outFile = path.resolve(
    projectRoot,
    args.out ?? path.join("out", `${slug}.${format}.mp4`),
  );
  mkdirSync(path.dirname(outFile), { recursive: true });

  const propsFile = path.join(projectRoot, "out", `${slug}.${format}.props.json`);
  writeFileSync(propsFile, `${JSON.stringify(props, null, 2)}\n`);

  console.log(`\n  ${story ? `story: ${story.title} (${story.slug})` : "sample props"}`);
  console.log(`  quote: ${quote}\n`);

  if (!args.skipRender) {
    const bin = path.join(
      projectRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "remotion.cmd" : "remotion",
    );
    const cli = [
      "render",
      composition,
      `"${outFile}"`,
      `--props="${propsFile}"`,
      "--public-dir=../public",
    ].join(" ");
    console.log(`  $ remotion ${cli}\n`);
    const result = spawnSync(`"${bin}" ${cli}`, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) throw new Error(`render failed (exit ${result.status})`);
  }

  const bytes = statSync(outFile).size;
  console.log(`\n  rendered  ${path.relative(repoRoot, outFile)}  ${(bytes / 1e6).toFixed(2)} MB`);

  if (args.upload) {
    const key = `quote-cards/${keySlug}.${format}.mp4`;
    const { bytes: uploaded } = await upload(outFile, key);
    console.log(`  uploaded  s3://${BUCKET}/${key}  (${(uploaded / 1e6).toFixed(2)} MB)`);
    console.log(`  on site   ${publicUrl(key)}`);
    console.log(
      "  note      the story page shows the card automatically; a re-render\n            reuses the key, so give the CDN five minutes to catch up\n",
    );
  } else {
    console.log("  (not uploaded — pass --upload to put it in Object Storage)\n");
  }
}

main().catch((error) => {
  console.error(`\n  ${error.message}\n`);
  process.exit(1);
});
