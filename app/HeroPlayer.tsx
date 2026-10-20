"use client";

import {
  Player,
  type CallbackListener,
  type PlayerRef,
} from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import HeroSequence from "./HeroSequence";
import {
  HERO_FPS,
  HERO_SLIDE_FRAMES,
  heroCoverIndexAt,
  type HeroCover,
} from "./heroCovers";
import s from "./HeroFigure.module.scss";

/**
 * The moving layer of the hero.
 *
 * It is loaded only on the client, only when there are at least two covers,
 * and never for a reader who prefers reduced motion. The static cover beneath
 * it is the page's real first paint; this component is an enhancement that the
 * reader can pause, and that stops when the figure leaves the viewport or the
 * tab is hidden.
 */
export default function HeroPlayer({
  covers,
  paused,
  onIndexChange,
  onReady,
}: {
  covers: HeroCover[];
  paused: boolean;
  onIndexChange: (index: number) => void;
  onReady: () => void;
}) {
  const playerRef = useRef<PlayerRef>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [inView, setInView] = useState(true);
  const [hidden, setHidden] = useState(false);
  const inputProps = useMemo(() => ({ covers }), [covers]);

  // Match the composition to the frame rather than forcing the frame to match
  // a fixed composition: the figure is 4:5 on desktop and 16:10 on phones.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const observer = new ResizeObserver(([entry]) => {
      const next = {
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    });

    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );

    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (paused || !inView || hidden) player.pause();
    else player.play();
  }, [paused, inView, hidden, size.width]);

  // Let the figure reveal its pause control only once the Player is actually
  // in the tree; a failed/slow chunk leaves the static cover alone.
  useEffect(() => {
    if (size.width > 0 && size.height > 0) onReady();
  }, [size.width, size.height, onReady]);

  // Report only the turn, not every frame: the link over the figure changes
  // when the cover does, and at no other time.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // The Player can remount or change size; resync the link to the frame that
    // is actually on screen before listening for the next turn.
    const current = heroCoverIndexAt(
      player.getCurrentFrame(),
      covers.length,
    );
    lastIndex.current = current;
    onIndexChange(current);

    const onFrame: CallbackListener<"frameupdate"> = (event) => {
      const index = heroCoverIndexAt(event.detail.frame, covers.length);
      if (index !== lastIndex.current) {
        lastIndex.current = index;
        onIndexChange(index);
      }
    };

    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [covers.length, onIndexChange, size.width]);

  // A local handle for checking the loop frame by frame. It is never attached
  // on the deployed site.
  useEffect(() => {
    if (size.width === 0) return;
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return;

    const player = playerRef.current;
    if (!player) return;

    const debug = {
      seek: (frame: number) => player.seekTo(frame),
      pause: () => player.pause(),
      play: () => player.play(),
      frame: () => player.getCurrentFrame(),
    };

    (window as Window & { __hero?: typeof debug }).__hero = debug;
    return () => {
      delete (window as Window & { __hero?: typeof debug }).__hero;
    };
  }, [size.width]);

  return (
    <div ref={boxRef} className={s.player} aria-hidden="true" inert>
      {size.width > 0 && size.height > 0 && (
        <Player
          ref={playerRef}
          component={HeroSequence}
          inputProps={inputProps}
          durationInFrames={covers.length * HERO_SLIDE_FRAMES}
          fps={HERO_FPS}
          compositionWidth={size.width}
          compositionHeight={size.height}
          style={{ width: "100%", height: "100%" }}
          autoPlay
          loop
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          allowFullscreen={false}
          numberOfSharedAudioTags={0}
          acknowledgeRemotionLicense
          errorFallback={() => <div style={{ width: "100%", height: "100%" }} />}
        />
      )}
    </div>
  );
}
