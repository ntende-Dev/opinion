"use client";
import { useEffect, useRef } from "react";

/**
 * The desk word ends on the column's edge, whatever its name — "World"
 * reaches for it, "Entertainment" still spans the line. Measurement is the
 * only way to hold a typeface to a width: the client measures the rendered
 * glyphs once (and again when the webfont finishes loading or the column
 * changes size) and sets the size to the fraction the line actually is of
 * the column. The server's container-query estimate stands until then, so
 * a reader without script still gets a word within a few percent.
 *
 * The lockup is set at 97% of the column: a full 100 bleeds into the beat
 * on the right edge of the reference masthead.
 */
export default function FitWord({
  initialSize,
  className,
  children,
}: {
  initialSize: string;
  className?: string;
  children: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const fit = () => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const line = range.getBoundingClientRect().width;
      if (line <= 0) return;
      const padX =
        parseFloat(getComputedStyle(parent).paddingLeft) +
        parseFloat(getComputedStyle(parent).paddingRight);
      const target = (parent.clientWidth - padX) * 0.97;
      if (Math.abs(line - target) / target < 0.005) return;
      const current = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${(current * (target / line)).toFixed(2)}px`;
    };

    // A second pass lets rounding settle before the observer takes over.
    const settle = () => {
      fit();
      requestAnimationFrame(() => fit());
    };

    settle();
    document.fonts?.ready.then(settle);
    const ro = new ResizeObserver(() => {
      // The node's own font-size change doesn't reflow the column, so
      // observing the column alone keeps this from looping on itself.
      fit();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  return (
    <h1
      ref={ref}
      className={className}
      style={{ "--desk-size": initialSize } as React.CSSProperties}
    >
      {children}
    </h1>
  );
}
