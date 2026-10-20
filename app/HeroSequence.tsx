import { AbsoluteFill, useCurrentFrame } from "remotion";
import { objectPosition } from "@/lib/focal";
import {
  HERO_FADE_FRAMES,
  HERO_SLIDE_FRAMES,
  type HeroCover,
} from "./heroCovers";

/**
 * The cover loop itself.
 *
 * Each cover holds for 5 seconds. Over the last 0.6 seconds the next cover
 * fades in above it, so the loop hands over without a white frame or a jump.
 * The images are only the picture: the link that sits over the figure is
 * owned by HeroFigure, which hands its target over at the middle of the
 * dissolve.
 */
export default function HeroSequence({ covers }: { covers: HeroCover[] }) {
  const frame = useCurrentFrame();
  const index = Math.floor(frame / HERO_SLIDE_FRAMES) % covers.length;
  const local = frame % HERO_SLIDE_FRAMES;
  const fadeStart = HERO_SLIDE_FRAMES - HERO_FADE_FRAMES;
  const fade =
    local >= fadeStart ? (local - fadeStart) / HERO_FADE_FRAMES : 0;
  const next = (index + 1) % covers.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      {covers.map((cover, i) => {
        const isCurrent = i === index;
        const isIncoming = i === next && fade > 0;

        return (
          <AbsoluteFill
            key={cover.slug}
            style={{
              opacity: isCurrent ? 1 : isIncoming ? fade : 0,
              // The incoming cover rides above the outgoing one, so the
              // dissolve reveals it rather than fading through the page.
              zIndex: isIncoming ? 2 : isCurrent ? 1 : 0,
              pointerEvents: "none",
            }}
          >
            <img
              src={cover.coverImage}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "low"}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: objectPosition(cover.focalX, cover.focalY),
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}
