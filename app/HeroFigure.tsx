"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroCover } from "./heroCovers";
import s from "./HeroFigure.module.scss";

// The Player is a separate chunk: the static cover is the first paint, the
// loop is an enhancement, and reduced-motion readers never download it.
const HeroPlayer = dynamic(() => import("./HeroPlayer"), { ssr: false });

export default function HeroFigure({ covers }: { covers: HeroCover[] }) {
  const first = covers[0];
  const hasLoop = covers.length > 1;
  const figureRef = useRef<HTMLElement>(null);

  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (!hasLoop) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(query.matches);
      if (query.matches) {
        setMounted(false);
        setIndex(0);
        setUserPaused(false);
        setResumed(false);
      }
    };

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [hasLoop]);

  // Mount only once the figure has been near the viewport, so a phone reader
  // who never scrolls to the cover does not pay for the Player chunk.
  useEffect(() => {
    if (!hasLoop || reduced) return;
    const figure = figureRef.current;
    if (!figure) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(figure);
    return () => observer.disconnect();
  }, [hasLoop, reduced]);

  useEffect(() => {
    if (!hasLoop || reduced || !seen) return;

    // Let the first paint and the figure's own entrance settle before handing
    // it over to the Player; the static cover is already the LCP.
    const id = window.setTimeout(() => setMounted(true), 700);
    return () => window.clearTimeout(id);
  }, [hasLoop, reduced, seen]);

  useEffect(() => {
    if (!mounted) setIndex(0);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) setPlayerReady(false);
  }, [mounted]);

  const handleReady = useCallback(() => setPlayerReady(true), []);

  const active = covers[Math.min(index, covers.length - 1)];
  const paused = userPaused || (!resumed && (hovered || focused));

  return (
    <figure
      ref={figureRef}
      className={s.figure}
      aria-label={covers.length > 0 ? "Recent story covers" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") {
          setHovered(false);
          setResumed(false);
        }
      }}
    >
      <div className={s.media}>
        {first ? (
          <img
            src={first.coverImage}
            alt=""
            draggable={false}
            fetchPriority="high"
            className={s.image}
          />
        ) : (
          <img
            src="/hero-emblem.svg"
            alt="The Opinion Weekly masthead emblem"
            draggable={false}
            fetchPriority="high"
            className={s.image}
          />
        )}

        {mounted && hasLoop && (
          <HeroPlayer
            covers={covers}
            paused={paused}
            onIndexChange={setIndex}
            onReady={handleReady}
          />
        )}
      </div>

      {active && (
        <Link
          href={`/story/${active.slug}`}
          className={s.link}
          aria-label={`Read ${active.title}`}
          onFocus={() => {
            setFocused(true);
            setResumed(false);
          }}
          onBlur={() => setFocused(false)}
        />
      )}

      {playerReady && hasLoop && !reduced && (
        <button
          type="button"
          className={s.control}
          aria-label={
            userPaused
              ? "Resume automatic cover changes"
              : "Pause automatic cover changes"
          }
          onClick={() => {
            if (userPaused) {
              setUserPaused(false);
              setResumed(true);
            } else {
              setUserPaused(true);
              setResumed(false);
            }
          }}
        >
          {userPaused ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3.5 1.5 10.5 6l-7 4.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M4 2v8M8 2v8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}
    </figure>
  );
}
