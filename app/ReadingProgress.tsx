"use client";

import { useEffect, useRef } from "react";
import s from "./ReadingProgress.module.scss";

/**
 * The rule at the head of a story that fills as the reader moves through it.
 *
 * It reports position rather than decorating the page — the paper's own version
 * of the scrollbar — so it earns its place under DESIGN.md's rule that a
 * structural device must carry information. The fill is a composited scaleX,
 * driven by one passive listener and coalesced into a single frame.
 */
export default function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    let frame = 0;

    const draw = () => {
      frame = 0;
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      const read =
        travel > 0 ? Math.min(1, Math.max(0, window.scrollY / travel)) : 0;
      el.style.setProperty("--read", read.toFixed(4));
    };

    const request = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(draw);
    };

    // A frame callback does not run while the tab is hidden, so a reader who
    // comes back to one would find the rule wherever they left it. Redraw as
    // soon as the page is actually on screen again (and on a bfcache restore).
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };

    draw();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    window.addEventListener("pageshow", request);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      window.removeEventListener("pageshow", request);
      document.removeEventListener("visibilitychange", onVisible);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={bar} className={s.track} aria-hidden="true">
      <div className={s.fill} />
    </div>
  );
}
