import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Navbar logo animation — an entrance, then a long hold so the loop never
 * feels busy. Uses the real brand asset (opinionLogo.svg) plus a deep-red
 * rule that sweeps underneath, echoing the full-stop accent of the hero.
 *
 * Transparent background: renders to alpha webm for the site header.
 */
export const LogoAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo settles in: rises 14px, perceptual scale 0.94 → 1, fades in.
  const entrance = interpolate(frame, [0, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Red rule sweeps left → right underneath, starting as the logo lands.
  const ruleWidth = interpolate(frame, [0.6 * fps, 1.5 * fps], [0, 600], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 600, height: 120 }}>
        <Img
          src={staticFile("opinionLogo.svg")}
          style={{
            width: 600,
            height: 120,
            opacity: entrance,
            translate: `0px ${interpolate(entrance, [0, 1], [14, 0])}px`,
            scale: `${0.94 + 0.06 * entrance}`,
          }}
        />
        <div
          style={{
            marginTop: 16,
            marginLeft: 4,
            height: 5,
            width: `${ruleWidth}px`,
            backgroundColor: "#EC2227",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
