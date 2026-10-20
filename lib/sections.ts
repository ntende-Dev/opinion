/**
 * The paper's filing desks.
 *
 * A story carries one of these ids (stories.section); editors choose it on the
 * write form. The masthead's section row prints only the desks that have
 * something published, so a section link never lands a reader on an empty page
 * — an unfiled story simply is not in the row yet. A desk with nothing filed
 * still has a real page at /section/<id>, so the URL is safe to share.
 *
 * The id is both the stored value and the URL segment.
 */
export const SECTION_IDS = [
  "politics",
  "business",
  "world",
  "opinion",
  "sport",
  "technology",
  "entertainment",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * A desk may carry its own branding device. "tiles" gives the desk word a
 * per-letter colour-plate cover with the strip from `strip`.
 */
export type Desk = {
  readonly id: SectionId;
  readonly name: string;
  readonly deck: string;
  readonly brand?: { readonly kind: "tiles"; readonly strip: string };
};

export const SECTIONS: readonly Desk[] = [
  {
    id: "politics",
    name: "Politics",
    deck: "Power, policy and the arguments that decide who governs.",
  },
  {
    id: "business",
    name: "Business",
    deck: "Markets, money and the work that pays for everything else.",
  },
  {
    id: "world",
    name: "World",
    deck: "Dispatches from beyond our borders, read from here.",
  },
  {
    id: "opinion",
    name: "Opinion",
    deck: "Argument for its own sake — columns, replies and rebuttals.",
  },
  {
    id: "sport",
    name: "Sport",
    deck: "Results, rivalries and the people who play for more than a win.",
  },
  {
    id: "technology",
    name: "Technology",
    deck: "Tools, networks and the slow revolutions they bring.",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    deck: "Screens, stages and the culture that fills the hours between.",
    /** The culture desk carries its own cover: heavy-caps letter tiles on a
     *  cycling palette, plus the note strip with the publication week. Every
     *  other desk keeps the standing word lockup. */
    brand: { kind: "tiles", strip: "Arts & Entertainment" },
  },
];

/** Guards anything arriving from a URL, a form or the API. */
export function isSectionId(value: unknown): value is SectionId {
  return (
    typeof value === "string" &&
    SECTION_IDS.some((section) => section === value)
  );
}

export function sectionById(id: string): Desk | undefined {
  return SECTIONS.find((section) => section.id === id);
}
