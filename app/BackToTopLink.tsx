"use client";

import type { MouseEvent } from "react";

/**
 * The return to the top of a story.
 *
 * The anchor stands on its own: before hydration, with JavaScript off, and for
 * a reader who asked for less motion, it is the browser's own jump to #main.
 * This only upgrades the ordinary click and Enter path to a short scroll, so
 * the reader keeps their bearings through the length of the piece.
 *
 * The skip link is deliberately not built this way — delaying access to the
 * content is the one place a smooth scroll does the reader a disservice.
 */
export default function BackToTopLink({ className }: { className?: string }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click belongs to the browser: open in a new tab, download.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    // The backstop, checked at the moment of the click rather than at mount.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const main = document.getElementById("main");
    if (!main) return;

    event.preventDefault();
    main.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus follows the reading position without yanking the scroll back to
    // the target mid-flight.
    main.focus({ preventScroll: true });
    // Match the native fragment: the address bar names where the reader is,
    // and Back returns them to the end of the story.
    window.history.pushState(null, "", "#main");
  }

  return (
    <a href="#main" className={className} onClick={onClick}>
      Back to top
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </a>
  );
}
