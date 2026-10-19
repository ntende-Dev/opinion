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
export const SECTIONS = [
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
  },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/** Guards anything arriving from a URL, a form or the API. */
export function isSectionId(value: unknown): value is SectionId {
  return (
    typeof value === "string" && SECTIONS.some((section) => section.id === value)
  );
}

export function sectionById(id: string) {
  return SECTIONS.find((section) => section.id === id);
}
