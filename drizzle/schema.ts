import { pgTable, serial, text, integer, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("contributor"),
  avatarUrl: text("avatar_url"),
  emailVerified: text("email_verified"),
  verificationToken: text("verification_token"),
  verificationTokenExpires: text("verification_token_expires"),
  /** Password-reset: only the SHA-256 hash of the emailed token is stored. */
  resetToken: text("reset_token"),
  resetTokenExpires: text("reset_token_expires"),
});

export const stories = pgTable(
  "stories",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    excerpt: text("excerpt").notNull().default(""),
    content: text("content").notNull().default(""),
    coverImage: text("cover_image"),
    /** Where the cover crop centres, as a percentage from the left. */
    coverFocalX: integer("cover_focal_x").notNull().default(50),
    /** Where the cover crop centres, as a percentage from the top. */
    coverFocalY: integer("cover_focal_y").notNull().default(50),
    status: text("status").notNull().default("draft"),
    /** Filing desk — one of the ids in lib/sections.ts, or null while unfiled. */
    section: text("section"),
    authorId: serial("authorId").notNull().references(() => users.id),
    reviewNote: text("review_note"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    // public feed: WHERE status = ... ORDER BY created_at DESC (btree scans backward)
    index("idx_stories_status_created_at").on(t.status, t.createdAt),
    // dashboard "my stories": WHERE "authorId" = ... ORDER BY created_at DESC
    index("idx_stories_author_created_at").on(t.authorId, t.createdAt),
  ],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    handled: text("handled").notNull().default("false"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    // editors inbox: WHERE handled = ... ORDER BY created_at DESC
    index("idx_contact_handled_created_at").on(t.handled, t.createdAt),
  ],
);
