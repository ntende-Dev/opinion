import { loadFont as loadLiterata } from "@remotion/google-fonts/Literata";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";

/**
 * Palette and type copied from DESIGN.md / app/globals.scss so a card is
 * recognisably the same publication as the site.
 */
export const palette = {
  paper: "#ffffff",
  ink: "#111827",
  accent: "#7f1d1d",
  muted: "#475569",
  line: "#cbd5e1",
} as const;

// Literata is the editorial voice (headlines + body); Outfit is UI chrome
// only, exactly as on the site. loadFont() registers the faces and blocks
// the render until they are ready.
const literataRoman = loadLiterata("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});
loadLiterata("italic", { weights: ["400"], subsets: ["latin"] });
const outfit = loadOutfit("normal", { weights: ["500", "600"], subsets: ["latin"] });

export const fonts = {
  serif: literataRoman.fontFamily,
  ui: outfit.fontFamily,
} as const;
