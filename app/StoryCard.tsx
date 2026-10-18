"use client";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import Link from "next/link";

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
  const titleId = useId();

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
      <p className="mt-2 font-ui text-sm leading-snug">
        {story.authorName && (
          <span className="text-[var(--color-ink)] underline underline-offset-2 decoration-1">
            {story.authorName}
          </span>
        )}
        {story.authorName && (
          <span className="mx-2 text-[var(--color-line)]" aria-hidden="true">
            |
          </span>
        )}
        {story.publishedAt || story.createdAt ? (
          <span className="text-[var(--color-muted)]">
            Published {timeAgo(story.publishedAt || story.createdAt)}
          </span>
        ) : null}
      </p>
    );
  }

  return (
    <>
      <article className="group relative flex gap-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 sm:p-4 transition-colors hover:border-[var(--color-muted)]">
        {story.coverImage && (
          <img
            src={story.coverImage}
            alt=""
            className="w-24 sm:w-40 md:w-52 shrink-0 aspect-[4/3] object-cover rounded border border-[var(--color-line)]"
          />
        )}
        <div className="min-w-0 py-1">
          <h3 className="font-display font-bold text-[1.05rem] sm:text-[1.35rem] leading-[1.25] clamp-3">
            {story.title}
          </h3>
          <Byline />
          {story.excerpt && (
            <p className="mt-2 hidden sm:block text-sm text-[var(--color-muted)] leading-relaxed clamp-3">
              {story.excerpt}
            </p>
          )}
        </div>
        {/* Stretched click target — the whole card opens the modal. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 rounded-lg"
          aria-label={`Read ${story.title}`}
        />
      </article>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-8"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto my-4 w-full max-w-3xl rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-10"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close story"
                className="absolute right-3 top-3 rounded p-2 text-[var(--color-muted)] hover:bg-[var(--color-line)] hover:text-[var(--color-ink)] transition-colors"
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
                  className="mb-6 w-full aspect-[16/9] object-cover rounded border border-[var(--color-line)]"
                />
              )}
              <h2
                id={titleId}
                className="font-display font-bold text-2xl sm:text-3xl leading-[1.15] pr-8"
              >
                {story.title}
              </h2>
              <div className="mt-3">
                <Byline />
              </div>
              <hr className="my-6 border-[var(--color-line)]" />
              <div
                className="prose-content leading-relaxed"
                dangerouslySetInnerHTML={{ __html: story.content }}
              />
              <p className="mt-8 pt-4 border-t border-[var(--color-line)] font-ui text-sm">
                <Link
                  href={`/story/${story.slug}`}
                  className="text-[var(--color-accent)] underline underline-offset-2"
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
