"use client";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
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
      toast.success("Story unpublished — it’s back in the editor’s drafts.");
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
        `Delete “${story.title}” permanently? This cannot be undone.`,
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

  /**
   * The overlay is a modal dialog, so it holds the keyboard while it is up:
   * Escape closes it, focus moves into the dialog on open and returns to the
   * card that opened it on close, and Tab cycles inside the dialog instead of
   * walking the page behind the veil. Body scroll is locked for the duration.
   */
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const stops = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Hand the reader back to the card they opened.
      opener?.focus?.();
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
          // Relative time is computed at render, so a minute boundary crossed
          // between the server render and hydration reads as a text mismatch.
          <span className={styles.bylineTime} suppressHydrationWarning>
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
          <img
            src={story.coverImage}
            alt=""
            width={1200}
            height={675}
            className={styles.cardImage}
          />
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
          // The backdrop click is a mouse shortcut only: the keyboard paths are
          // Escape and the close button, and the dialog stops propagation.
          <div
            className={styles.modalOverlay}
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              ref={dialogRef}
              tabIndex={-1}
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
                  width={1200}
                  height={675}
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
