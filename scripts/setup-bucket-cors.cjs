// Idempotent: writes the CORS rule that lets browsers PUT images directly
// to the assets bucket (Object Storage is branch-scoped, so run this once per
// branch that hosts uploads — normally just the production/default branch).
//
//   node scripts/setup-bucket-cors.cjs     (run from the project root)
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const envVal = (key) => {
  for (const f of [".env", ".env.local"]) {
    const raw = fs.readFileSync(path.join(process.cwd(), f), "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((l) => l.startsWith(key + "="));
    if (line) return line.slice(key.length + 1).trim().replace(/^"|"$/g, "");
  }
  return process.env[key];
};

const required = ["AWS_ENDPOINT_URL_S3", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
for (const k of required) {
  if (!envVal(k)) {
    console.error(`missing env var: ${k}`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  endpoint: envVal("AWS_ENDPOINT_URL_S3"),
  region: envVal("AWS_REGION"),
  credentials: {
    accessKeyId: envVal("AWS_ACCESS_KEY_ID"),
    secretAccessKey: envVal("AWS_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
});

const BUCKET_NAME = "assets";

const allowedOrigins = [
  ...new Set(
    [
      envVal("NEXTAUTH_URL"), // the canonical site origin
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002", // dev-server port fallbacks
    ].filter(Boolean),
  ),
];

(async () => {
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: allowedOrigins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["content-type"],
            ExposeHeaders: ["etag"],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    }),
  );
  console.log(`CORS rule written for bucket "${BUCKET_NAME}"`);
  console.log("allowed origins:", allowedOrigins.join(", "));
})();
