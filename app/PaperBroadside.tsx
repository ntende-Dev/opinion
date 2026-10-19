"use client";

import { useEffect, useRef, useState } from "react";
import type { PaperScene } from "./paper/paperScene";
import s from "./PaperBroadside.module.scss";

/**
 * The paper's line, set for print.
 *
 * A single printed sheet carries the sentence the About page is built on. It is
 * rendered live (see paper/paperScene.ts) but it is not required: the plain
 * typographic pull quote underneath is the real content, so a reader without
 * JavaScript, without WebGL, or with reduced motion turned on still gets the
 * page exactly as it should read. The sheet only fades in once it has painted
 * its first frame.
 */
export default function PaperBroadside() {
  const figRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fig = figRef.current;
    const canvas = canvasRef.current;
    if (!fig || !canvas) return;

    let disposed = false;
    let started = false;
    let scene: PaperScene | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    async function start() {
      if (started || disposed) return;
      started = true;

      /* The inked line is set in the same face as the page. next/font exposes
         the generated family on :root; wait for it so the mask is not painted
         with the metric-adjusted fallback. */
      let family = "Georgia, serif";
      try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-literata").trim();
        const first = raw.split(",")[0].trim().replace(/^["']|["']$/g, "");
        if (first) family = `"${first}"`;
        await document.fonts.ready;
        await document.fonts.load(`400 64px ${family}`);
      } catch {
        /* a fallback family is fine — the sheet is already the enhancement */
      }
      if (disposed) return;

      let mod: typeof import("./paper/paperScene");
      try {
        mod = await import("./paper/paperScene");
      } catch {
        return;
      }
      if (disposed) return;

      try {
        scene = mod.createPaperScene({
          canvas,
          host: fig,
          lines: ["Everything here", "is argument."],
          fontFamily: family,
          reducedMotion: reduce.matches,
          onReady: () => {
            if (!disposed) setReady(true);
          },
        });
      } catch {
        /* WebGL unavailable, context lost, or shader refused: the pull quote stays. */
        scene = null;
      }
    }

    /* Load only when the reader is close enough to see it. The synchronous
       check covers a figure that is already on screen at first paint (and any
       environment that defers rendering callbacks). */
    const near = () => {
      const r = fig.getBoundingClientRect();
      return r.top < window.innerHeight + 320 && r.bottom > -320;
    };
    if (near()) void start();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            void start();
          }
        }
      },
      { rootMargin: "320px 0px" },
    );
    io.observe(fig);

    const onMove = (e: PointerEvent) => {
      const r = fig.getBoundingClientRect();
      scene?.setPointer(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onLeave = () => scene?.setPointer(0, 0);
    if (fine.matches) {
      fig.addEventListener("pointermove", onMove, { passive: true });
      fig.addEventListener("pointerleave", onLeave, { passive: true });
    }

    const onReduce = () => scene?.setReducedMotion(reduce.matches);
    reduce.addEventListener("change", onReduce);

    /* If the GPU drops the context, hand the page back to the typographic
       pull quote rather than leaving an empty plate. */
    const onLost = () => setReady(false);
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      io.disconnect();
      fig.removeEventListener("pointermove", onMove);
      fig.removeEventListener("pointerleave", onLeave);
      reduce.removeEventListener("change", onReduce);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene?.dispose();
      scene = null;
    };
  }, []);

  return (
    <figure ref={figRef} className={`${s.figure} ${ready ? s.ready : ""}`}>
      <div className={s.plate}>
        <p className={s.quote}>
          Everything here
          <br />
          is argument.
        </p>
        <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      </div>
    </figure>
  );
}
