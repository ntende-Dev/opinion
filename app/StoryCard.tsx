"use client";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { EDITORS } from "@/lib/roles";
import { toast } from "sonner";
import styles from "./StoryCard.module.scss";

export type CardStory = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  content: string;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks} week${wks === 1 ? "" : "s"} ago`;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Johannesburg",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Story card in the front-page style: image left, bold headline, byline row
 * (author — published relative time), three-line excerpt. Clicking anywhere
 * on the card opens the full story in a modal overlay — the shareable
 * /story/<slug> page stays one click away inside the modal.
 */
export default function StoryCard({ story }: { story: CardStory }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const titleId = useId();
  const router = useRouter();
  const { data: session } = useSession();

  // Management privileges: admins and editors only (contributors revise
  // their own work through the review queue instead).
  const canManage = EDITORS.includes(
    ((session?.user as any)?.role as string | undefined) ?? "",
  );

  /** PATCH status published → draft. The card disappears on refresh. */
  async function unpublish() {
    setWorking("unpublish");
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || "Could not unpublish");
      toast.success("Story unpublished — it's back in the editor's drafts.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not unpublish");
    } finally {
      setWorking(null);
    }
  }

  /** DELETE is permanent — confirm first. */
  async function remove() {
    if (
      !window.confirm(
        `Delete "${story.title}" permanently? This cannot be undone.`,
      )
    )
      return;
    setWorking("delete");
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || "Could not delete");
      toast.success("Story deleted.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setWorking(null);
    }
  }

  // ESC closes; body scroll is locked while the modal is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function Byline() {
    return (
      <p className={styles.byline}>
        {story.authorName && (
          <span className={styles.bylineAuthor}>{story.authorName}</span>
        )}
        {story.authorName && (
          <span className={styles.bylineSeparator} aria-hidden="true">
            |
          </span>
        )}
        {story.publishedAt || story.createdAt ? (
          <span className={styles.bylineTime}>
            Published {timeAgo(story.publishedAt || story.createdAt)}
          </span>
        ) : null}
      </p>
    );
  }

  return (
    <>
      <article className={styles.card}>
        {story.coverImage && (
          <img src={story.coverImage} alt="" className={styles.cardImage} />
        )}
        <div className={styles.cardBody}>
          <h3 className={`${styles.cardTitle} font-display clamp-3`}>
            {story.title}
          </h3>
          <Byline />
          {story.excerpt && (
            <p className={`${styles.excerpt} clamp-3`}>{story.excerpt}</p>
          )}
        </div>
        {/* Stretched click target — the whole card opens the modal. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={styles.cardOverlay}
          aria-label={`Read ${story.title}`}
        />
      </article>

      {open &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
              className={styles.dialog}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close story"
                className={styles.dialogClose}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>

              {story.coverImage && (
                <img
                  src={story.coverImage}
                  alt=""
                  className={styles.dialogImage}
                />
              )}
              <h2
                id={titleId}
                className={`${styles.dialogTitle} font-display`}
              >
                {story.title}
              </h2>
              <div className={styles.dialogByline}>
                <Byline />
              </div>
              <hr className={styles.dialogRule} />
              <div
                className={`${styles.dialogBody} prose-content`}
                dangerouslySetInnerHTML={{ __html: story.content }}
              />
              {canManage && (
                <div className={styles.manage}>
                  <span className={styles.manageLabel}>Manage</span>
                  <Link
                    href={`/dashboard/write?story=${story.id}&from=home`}
                    onClick={() => setOpen(false)}
                    className={styles.manageLink}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={unpublish}
                    disabled={working !== null}
                    className={styles.manageUnpublish}
                  >
                    {working === "unpublish" ? "Unpublishing…" : "Unpublish"}
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={working !== null}
                    className={styles.manageDanger}
                  >
                    {working === "delete" ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
              <p className={styles.dialogFooter}>
                <Link
                  href={`/story/${story.slug}`}
                  className={styles.dialogFooterLink}
                  onClick={() => setOpen(false)}
                >
                  Open the full story page ↓
                </Link>
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
