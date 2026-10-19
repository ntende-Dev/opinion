import React from "react";
import { Composition } from "remotion";
import { QuoteCard } from "./QuoteCard";
import { sampleProps } from "./sampleQuote";

const FPS = 30;
const DURATION = 270; // 9s: enough to read a long pull-quote twice

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 9:16 — Reels, Stories, TikTok */}
      <Composition
        id="QuoteCard"
        component={QuoteCard}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={sampleProps}
      />
      {/* 1:1 — feed posts on X / LinkedIn / Instagram */}
      <Composition
        id="QuoteCardSquare"
        component={QuoteCard}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{ ...sampleProps, format: "square" }}
      />
    </>
  );
};
