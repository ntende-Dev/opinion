"use client";

import type { MouseEvent, ReactNode } from "react";

/**
 * A same-page anchor that scrolls rather than jumps.
 *
 * The href is the whole interface: before hydration, with JavaScript off, for
 * a modified click, for a reader who asked for less motion, or when the
 * target is missing, the browser's own fragment navigation runs untouched.
 *
 * `focusTarget` also moves focus to the destination, which is what a return
 * to the top of a story needs. Ordinary in-page calls leave focus on the link,
 * exactly as native fragment navigation does.
 */
export default function SmoothHashLink({
  href,
  className,
  children,
  focusTarget = false,
}: {
  href: `#${string}`;
  className?: string;
  children: ReactNode;
  focusTarget?: boolean;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click belongs to the browser: open in a new tab, download.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    // The backstop, checked at the moment of the click rather than at mount.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = document.getElementById(href.slice(1));
    if (!target) return;

    event.preventDefault();

    // Focus first, without scrolling, so a return lands at the top at the
    // moment it is asked for; then name the place, and start the motion last
    // so nothing after it can interrupt the scroll.
    if (focusTarget) target.focus({ preventScroll: true });
    // Match the native fragment: the address bar names where the reader is,
    // and Back returns them to where they clicked. A reader already at the
    // same fragment gets the scroll without a second history entry.
    if (window.location.hash !== href) {
      window.history.pushState(null, "", href);
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
