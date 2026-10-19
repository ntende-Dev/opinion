import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, palette } from "./theme";
import type { QuoteCardProps } from "./types";

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const LINE_HEIGHT = 1.26;

type Layout = {
  padX: number;
  padTop: number;
  padBottom: number;
  logo: number;
  author: number;
  title: number;
  date: number;
  handle: number;
  /** Vertical room the masthead, byline and footer need between them. */
  chrome: number;
};

const LAYOUT: Record<QuoteCardProps["format"], Layout> = {
  vertical: {
    padX: 104,
    padTop: 132,
    padBottom: 116,
    logo: 78,
    author: 44,
    title: 34,
    date: 28,
    handle: 26,
    chrome: 340,
  },
  square: {
    padX: 88,
    padTop: 92,
    padBottom: 84,
    logo: 64,
    author: 36,
    title: 29,
    date: 24,
    handle: 22,
    chrome: 300,
  },
};

/** Long quotes set smaller; short aphorisms stay monumental. */
function baseQuoteSize(length: number, format: QuoteCardProps["format"]): number {
  const vertical =
    length <= 70 ? 104 : length <= 110 ? 90 : length <= 160 ? 78 : length <= 220 ? 68 : length <= 300 ? 58 : 50;
  return format === "square" ? vertical * 0.86 : vertical;
}

/**
 * A pull-quote card: the masthead, the quote, the attribution, and nothing
 * else. Typography does the work — one accent rule above the byline and a
 * second closing the card, both of which encode structure rather than
 * decorate it (DESIGN.md principles 2 and 3).
 */
export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  author,
  title,
  date,
  handle,
  format,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const layout = LAYOUT[format];

  const text = quote.trim();

  // ---- type size: length-based, then shrink to fit the frame ----------
  const contentWidth = width - layout.padX * 2;
  const available = height - layout.padTop - layout.padBottom - layout.chrome;
  let quoteSize = baseQuoteSize(text.length, format);
  const charsPerLine = contentWidth / (quoteSize * 0.52);
  const lines = Math.ceil((text.length + 6) / charsPerLine);
  const needed = lines * quoteSize * LINE_HEIGHT;
  if (needed > available) {
    quoteSize = Math.max(32, quoteSize * (available / needed) * 0.98);
  }

  // ---- timeline -------------------------------------------------------
  // The quote arrives as one block. A long pull-quote revealed word by word
  // reads as a trick rather than as typography, and splitting it into spans
  // also loses the inter-word space in Chromium.
  const quoteIn = 26;
  const bylineIn = 96;
  const footerIn = bylineIn + 26;
  const fadeFrom = durationInFrames - 24;

  const at = (start: number, dur: number, ease = EASE_OUT) =>
    interpolate(frame, [start, start + dur], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    });

  const logoIn = at(4, 22);
  const ruleIn = at(18, 20);
  const quoteReveal = at(quoteIn, 22);
  const byline = at(bylineIn, 20);
  const bylineRule = at(bylineIn, 18);
  const footer = at(footerIn, 18);
  const footerRule = at(footerIn, 16);
  const fadeOut = interpolate(frame, [fadeFrom, durationInFrames - 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // A very slow push keeps the card alive without drawing attention to itself.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.02]);

  const rule = (progress: number, extra: React.CSSProperties = {}) => (
    <div
      style={{
        width: "100%",
        height: 1,
        backgroundColor: palette.line,
        transform: `scaleX(${progress})`,
        transformOrigin: "left center",
        ...extra,
      }}
    />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${push})`,
          transformOrigin: "50% 46%",
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: `${layout.padTop}px ${layout.padX}px ${layout.padBottom}px`,
          }}
        >
          {/* Masthead */}
          <div
            style={{
              opacity: logoIn,
              transform: `translateY(${(1 - logoIn) * -12}px)`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Img
              src={staticFile("opinionLogo.svg")}
              style={{ height: layout.logo, width: "auto" }}
            />
          </div>
          {rule(ruleIn, { marginTop: 30 })}

          {/* The quote — the hero */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              paddingTop: 24,
              paddingBottom: 24,
            }}
          >
            <p
              style={{
                margin: 0,
                width: "100%",
                fontFamily: fonts.serif,
                fontWeight: 400,
                fontStyle: "normal",
                fontSize: quoteSize,
                lineHeight: LINE_HEIGHT,
                letterSpacing: "-0.012em",
                color: palette.ink,
                textIndent: "-0.42em",
                textAlign: "left",
                // Balance the ragging: without it, a big pull-quote breaks
                // into one long line and one lonely word.
                ...({ textWrap: "balance" } as React.CSSProperties),
                opacity: quoteReveal,
                transform: `translateY(${(1 - quoteReveal) * 18}px)`,
              }}
            >
              <span style={{ color: palette.accent }}>“</span>
              {text}
              <span style={{ color: palette.accent }}>”</span>
            </p>
          </div>

          {/* Attribution */}
          <div
            style={{
              opacity: byline,
              transform: `translateY(${(1 - byline) * 10}px)`,
            }}
          >
            <div
              style={{
                width: 72,
                height: 3,
                backgroundColor: palette.accent,
                marginBottom: 26,
                transform: `scaleX(${bylineRule})`,
                transformOrigin: "left center",
              }}
            />
            <div
              style={{
                fontFamily: fonts.serif,
                fontWeight: 600,
                fontSize: layout.author,
                letterSpacing: "-0.01em",
                color: palette.ink,
              }}
            >
              {author}
            </div>
            {title ? (
              <div
                style={{
                  fontFamily: fonts.serif,
                  fontWeight: 400,
                  fontSize: layout.title,
                  lineHeight: 1.34,
                  color: palette.muted,
                  marginTop: 10,
                  maxWidth: "92%",
                }}
              >
                {title}
              </div>
            ) : null}
            {date ? (
              <div
                style={{
                  fontFamily: fonts.ui,
                  fontWeight: 500,
                  fontSize: layout.date,
                  color: palette.muted,
                  marginTop: 16,
                }}
              >
                {date}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div style={{ opacity: footer, marginTop: 34 }}>
            {rule(footerRule)}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 22,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.ui,
                  fontWeight: 500,
                  fontSize: layout.handle,
                  color: palette.muted,
                }}
              >
                {handle}
              </span>
              <span
                style={{
                  width: layout.handle * 0.62,
                  height: layout.handle * 0.62,
                  backgroundColor: palette.accent,
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
