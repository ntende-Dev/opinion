const { encode } = require("next-auth/jwt");
const Database = require("better-sqlite3");

const BASE = "http://127.0.0.1:3001";
const SECRET = "dev-opinion-secret-do-not-use-in-production-change-me";

const db = new Database("dev.sqlite");
db.prepare("DELETE FROM stories").run();

const SECRET2 = SECRET;

async function sessionToken(role, userId) {
  return await encode({ token: { sub: String(userId), role }, secret: SECRET2, maxAge: 60 * 60 });
}
function headers(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Cookie"] = `next-auth.session-token=${token}`;
  return h;
}
async function req(path, { method = "GET", token } = {}) {
  const res = await fetch(`${BASE}${path}`, { method, headers: headers(token), redirect: "manual" });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = text; }
  return { status: res.status, headers: res.headers, json, text, loc: res.headers.get("location") };
}

let passed = 0, failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log("PASS:", name); }
  else { failed++; console.log("FAIL:", name, extra); }
}

(async () => {
  const d = new Database("dev.sqlite");
  const users = d.prepare("SELECT id, name, role FROM users").all();
  const byRole = {};
  for (const u of users) byRole[u.role] = u;
  const contributor = byRole.contributor;
  const editor = byRole.editor;
  const contribTok = await sessionToken("contributor", contributor.id);
  const editorTok = await sessionToken("editor", editor.id);

  const create = await req("/api/stories", {
    method: "POST", token: contribTok,
    body: { title: "My Draft Story", slug: "my-draft-story", excerpt: "A draft excerpt", content: "<p>draft content</p>" },
  });
  check("contributor create draft returns 200", create.status === 200, JSON.stringify(create.json));
  const storyId = create.json.id;
  const slug = create.json.slug;

  const submit = await req(`/api/stories/${storyId}`, {
    method: "PATCH", token: contribTok, body: { status: "pending" },
  });
  check("contributor submit draft->pending returns 200", submit.status === 200, JSON.stringify(submit.json));
  check("story now pending", submit.json.status === "pending", JSON.stringify(submit.json));

  const badPublish = await req(`/api/stories/${storyId}`, {
    method: "PATCH", token: contribTok, body: { status: "published" },
  });
  check("contributor cannot publish pending (422)", badPublish.status === 422, JSON.stringify(badPublish.json));

  const pubView = await req(`/story/${slug}`);
  check("public gets 404 for pending story", pubView.status === 404, `status=${pubView.status}`);

  const ownView = await req(`/story/${slug}`, { token: contribTok });
  check("contributor can preview own pending (200)", ownView.status === 200, `status=${ownView.status}`);
  check("preview banner shown", ownView.text.includes("Preview"), "");

  const review = await req("/dashboard/review", { token: editorTok });
  check("editor review queue 200", review.status === 200, `status=${review.status}`);
  check("review queue lists story", review.text.includes("My Draft Story"), "");

  const publish = await req(`/api/stories/${storyId}`, {
    method: "PATCH", token: editorTok, body: { status: "published" },
  });
  check("editor publish pending->published 200", publish.status === 200, JSON.stringify(publish.json));
  check("story now published", publish.json.status === "published", JSON.stringify(publish.json));
  check("publishedAt stamped", !!publish.json.publishedAt, JSON.stringify(publish.json));

  const pubView2 = await req(`/story/${slug}`);
  check("public can view published story (200)", pubView2.status === 200, `status=${pubView2.status}`);

  const home = await req("/");
  check("homepage 200", home.status === 200);
  check("homepage lists published story", home.text.includes("My Draft Story"), "");

  const create2 = await req("/api/stories", {
    method: "POST", token: contribTok,
    body: { title: "Rejected Story", slug: "rejected-story", excerpt: "to be rejected", content: "<p>x</p>" },
  });
  const id2 = create2.json.id;
  await req(`/api/stories/${id2}`, { method: "PATCH", token: contribTok, body: { status: "pending" } });
  const reject = await req(`/api/stories/${id2}`, {
    method: "PATCH", token: editorTok, body: { status: "draft", reviewNote: "Needs more work" },
  });
  check("editor reject pending->draft with note 200", reject.status === 200, JSON.stringify(reject.json));
  check("reviewNote saved", reject.json.reviewNote === "Needs more work", JSON.stringify(reject.json));
  check("publishedAt cleared on reject", reject.json.publishedAt === null, JSON.stringify(reject.json));

  const dash = await req("/dashboard", { token: contribTok });
  check("contributor dashboard shows editor note", dash.text.includes("Needs more work"), "");

  const resubmit = await req(`/api/stories/${id2}`, {
    method: "PATCH", token: contribTok, body: { status: "pending" },
  });
  check("contributor resubmit draft->pending 200", resubmit.status === 200, JSON.stringify(resubmit.json));

  const unpublish = await req(`/api/stories/${storyId}`, {
    method: "PATCH", token: editorTok, body: { status: "draft" },
  });
  check("editor unpublish published->draft 200", unpublish.status === 200, JSON.stringify(unpublish.json));
  check("publishedAt preserved on unpublish", unpublish.json.publishedAt !== null && unpublish.json.publishedAt !== undefined, JSON.stringify(unpublish.json));

  const contribReview = await req("/dashboard/review", { token: contribTok });
  check("contributor redirected from review queue", contribReview.status === 307, `status=${contribReview.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });
