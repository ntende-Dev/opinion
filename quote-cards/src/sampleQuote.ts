import type { QuoteCardProps } from "./types";

/**
 * Defaults for the Studio and for `npm run render`. Deliberately generic:
 * `scripts/render-story.mjs` replaces all of this with a real story.
 */
export const sampleProps: QuoteCardProps = {
  quote:
    "An argument earns its place by surviving the strongest version of the case against it.",
  author: "Sample byline",
  title: "Placeholder card — render a real story with npm run render:story",
  date: "",
  handle: "opinionweekly.co.za",
  format: "vertical",
};
