"use client";

/**
 * The segment's error boundary. Anything unexpected — a dropped database
 * connection, a render fault — lands here with the page's furniture intact:
 * the masthead and colophon still stand around a short notice in the paper's
 * own voice. `retry` re-fetches and re-renders the segment.
 */
import Link from "next/link";
import { useEffect } from "react";
import e from "@/app/Editorial.module.scss";
import s from "@/app/ErrorPage.module.scss";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // The production release redacts the message, so this prints the redacted
    // shape plus a digest the server logs can be searched for.
    console.error(error);
  }, [error]);

  return (
    <div className="container font-body">
      <article className="measure-center">
        <p className={`${e.eyebrow} font-ui`}>The press stopped</p>
        <h1 className={`${e.title} font-display`}>The presses jammed</h1>
        <p className={`${e.standfirst} font-body`}>
          A page failed to come off the press. Nothing is lost — the story, the
          desk and the argument are all still on the slate. Run the page again,
          or step back to the front while the block is cleared.
        </p>

        <div className={s.actions}>
          <button
            type="button"
            onClick={() => retry()}
            className={`${s.primary} font-ui`}
          >
            Try again
          </button>
          <Link href="/" className={`${s.secondary} font-ui`}>
            Back to the front page
          </Link>
        </div>
      </article>
    </div>
  );
}
