"use client";
import { useEffect, useRef } from "react";
import s from "./RevealGrid.module.scss";

/**
 * The Latest grid arriving the way copy lands on a composing stone: each
 * card rises a little and settles, the right-hand card of a row a beat after
 * the left. The observer is per card, so a reader scrolling slowly gets the
 * same rhythm row after row rather than one distant flash.
 *
 * It is progressive by construction. Without JavaScript the cards simply
 * stand in the grid; the "not yet arrived" state is only ever applied from
 * the browser, in the same effect that watches the grid, and reduced-motion
 * readers get the destination immediately (the global backstop collapses the
 * transitions to nothing).
 */
export default function RevealGrid({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = wrap.current;
    if (!node || !("IntersectionObserver" in window)) return;

    const cards = node.querySelectorAll("li");
    try {
      cards.forEach((card) => card.classList.add(s.pending));
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add(s.in);
              io.unobserve(entry.target);
            }
          }
        },
        // Fire while the card is still slightly below the fold, so the lift
        // begins as the reader's eye reaches the row, not after it.
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
      );
      cards.forEach((card) => io.observe(card));
      return () => io.disconnect();
    } catch {
      // An observer that cannot start must never leave copy hidden.
      cards.forEach((card) => card.classList.remove(s.pending));
    }
  }, []);

  return (
    <div ref={wrap} className={s.wrap}>
      {children}
    </div>
  );
}
