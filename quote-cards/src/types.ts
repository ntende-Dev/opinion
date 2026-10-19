export type QuoteCardProps = {
  /** The pull-quote itself, without surrounding quote marks. */
  quote: string;
  author: string;
  /** Story title, shown under the author as context. */
  title: string;
  /** Pre-formatted display date, e.g. "12 October 2026". Optional. */
  date: string;
  /** Where to find the rest of it. Bottom-left of the card. */
  handle: string;
  format: "vertical" | "square";
};
