"use client";
import { useEffect, useRef } from "react";
import s from "./FitWord.module.scss";

/** The culture palette, in the order the letters cycle it. */
const TILES_DEFAULT = [
  "#a8938b", // mauve taupe
  "#577e2d", // olive green
  "#d8d838", // chartreuse
  "#87cbe9", // sky
  "#d6d0c2", // greige
  "#ef9611", // orange
  "#2fae76", // mint green
];

/**
 * The desk word ends on the column's edge, whatever its name — "World"
 * reaches for it, "Entertainment" still spans the line. Measurement is the
 * only way to hold a typeface to a width: the client measures the rendered
 * glyphs once (and again when the webfont finishes loading or the column
 * changes size) and sets the size to the fraction the line actually is of
 * the column. The server's container-query estimate stands until then, so
 * a reader without script still gets a word within a few percent.
 *
 * Two lockups share one fitter:
 * - the standing word — the desk's name set alone, at 97% of the column;
 * - the letter tiles (the culture desk) — every letter on its own colour
 *   plate, the band running the full column. Because the tile run is
 *   deliberate display furniture in both themes, its letters hold print
 *   ink rather than the theme's.
 */
export default function FitWord({
  initialSize,
  className,
  children,
  tiles,
}: {
  initialSize: string;
  className?: string;
  children: string;
  tiles?: boolean;
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
      // The tile band runs the whole column, edge to edge; the plain word
      // leaves a breath before the edge, the way the reference masthead does.
      const fill = tiles ? 1 : 0.97;
      const target = (parent.clientWidth - padX) * fill;
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
  }, [tiles]);

  if (tiles) {
    return (
      <h1
        ref={ref}
        className={className}
        aria-label={children}
        style={
          {
            "--desk-size": initialSize,
            fontFamily: "var(--font-ui)",
            fontWeight: 400,
            color: "#111827",
            whiteSpace: "nowrap",
            lineHeight: 0.9,
          } as React.CSSProperties
        }
      >
        {[...children].map((letter, index) => (
          <span
            key={index}
            className={s.tile}
            aria-hidden="true"
            style={{ backgroundColor: TILES_DEFAULT[index % TILES_DEFAULT.length] }}
          >
            {letter.toUpperCase()}
          </span>
        ))}
      </h1>
    );
  }

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
