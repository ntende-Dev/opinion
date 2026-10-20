"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getConsent,
  setConsent,
  OPEN_EVENT,
  type Consent,
} from "@/lib/consent";
import styles from "./CookieConsent.module.scss";

type BarState = "unread" | "open" | "leaving" | "closed";

/**
 * The consent bar. It is a notice, not a wall: the page stays readable and
 * scrollable behind it, because the only cookie the paper sets on its own —
 * the sign-in session — is strictly necessary and needs no consent to set.
 * What the bar does is record the visitor's answer so that anything optional
 * (analytics, if it is ever added) has a consent gate to sit behind, and it
 * can be reopened from the footer's "Cookie settings" at any time.
 *
 * It renders nothing until after mount, so the server HTML and the first
 * client frame agree; the bar then rises into place once, only if the
 * question still stands.
 */
export default function CookieConsent() {
  const [state, setState] = useState<BarState>("unread");
  const timerRef = useRef<number | null>(null);

  /* If the component leaves the page mid-exit, its timer leaves with it. */
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!getConsent()) setState("open");
    // "Cookie settings" in the footer asks the bar back, even after an answer.
    const reopen = () => setState("open");
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  if (state === "unread" || state === "closed") return null;

  const answer = (value: Consent) => {
    setConsent(value);
    setState("leaving");
    /* The animation's own end (below) does the exact handoff, but it can be
     * starved — a hidden tab freezes animations at zero, and an engine that
     * declines to run them never fires the event at all. The bar must never
     * linger, invisible or not, so a timer just past the exit duration
     * guarantees the unmount whichever way the exit completes. */
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("closed"), 400);
  };

  /* The leave animation's last frame must not linger: `forwards` would hold
   * the bar invisible but still clickable across the foot of the page, so the
   * exit hands the element back to React, which unmounts it. The guard keeps
   * the entrance animation from matching. */
  const settled = (event: React.AnimationEvent) => {
    if (state === "leaving" && event.animationName.includes("paper-leave")) {
      setState("closed");
    }
  };

  return (
    <aside
      className={`${styles.bar} ${state === "leaving" ? styles.leaving : ""}`}
      aria-label="Cookie preferences"
      data-print="hide"
      onAnimationEnd={settled}
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 className={`${styles.title} font-display`}>Cookies, briefly</h2>
          <p className={`${styles.body} font-ui`}>
            This site sets one cookie of its own — the one that keeps you signed
            in. It is essential, so it stays. Anything optional (analytics, if
            we ever add it) is set only after you accept. The{" "}
            <Link href="/privacy" className={styles.quietLink}>
              privacy note
            </Link>{" "}
            has the details, and cookie settings in the footer can change your
            mind at any time.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.accept} font-ui`}
            onClick={() => answer("all")}
          >
            Accept all
          </button>
          <button
            type="button"
            className={`${styles.essential} font-ui`}
            onClick={() => answer("essential")}
          >
            Essential only
          </button>
        </div>
      </div>
    </aside>
  );
}
