import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StoryGrid from "@/app/StoryGrid";
import FitWord from "@/app/FitWord";
import { sectionById, type SectionId } from "@/lib/sections";
import { listPublishedStories } from "@/lib/stories";
import styles from "./Section.module.scss";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ section: string }> };

/** One query per request even though metadata and the page both need it. */
const filedUnder = cache((section: SectionId) =>
  listPublishedStories({ section }),
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];

/**
 * Monday to Sunday of the publication week, Johannesburg time — the note
 * strip's date. Built from the paper's home zone so the strip never names
 * a week the filing desk isn't living in.
 */
function weekLabel() {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // YYYY-MM-DD
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const monday = new Date(Date.UTC(year, month - 1, day - ((weekday + 6) % 7)));
  const sunday = new Date(Date.UTC(year, month - 1, day - ((weekday + 6) % 7) + 6));
  const endMonth = sunday.getUTCMonth();
  const span = `${sunday.getUTCDate()} ${MONTHS[endMonth]} ${sunday.getUTCFullYear()}`;
  if (monday.getUTCMonth() === endMonth) {
    return `${monday.getUTCDate()} - ${span}`;
  }
  return `${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]} - ${span}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: id } = await params;
  const section = sectionById(id);
  if (!section) return { title: "Section not found" };

  const filed = await filedUnder(section.id);
  return {
    title: section.name,
    description: section.deck,
    alternates: { canonical: `/section/${section.id}` },
    // A desk with nothing filed is a real page, but there is nothing there
    // yet worth putting in front of a search engine.
    robots: filed.length ? undefined : { index: false, follow: true },
  };
}

export default async function SectionPage({ params }: Props) {
  const { section: id } = await params;
  const section = sectionById(id);
  if (!section) notFound();

  const filed = await filedUnder(section.id);

  /**
   * First approximation of the desk word's width, in em: Literata Black's
   * uppercase advances, calibrated once against a rendered line (the +3%
   * carries the face's true widths over these figures), and the negative
   * tracking. FitWord measures the real glyphs on the client and lands the
   * word exactly on the column width; this table just keeps the first
   * paint close for readers still without script.
   */
  const tiles = section.brand?.kind === "tiles";

  const wordEm = (() => {
    const ADV: Record<string, number> = {
      A: 0.74, B: 0.7, C: 0.73, D: 0.77, E: 0.68, F: 0.62, G: 0.78,
      H: 0.8, I: 0.37, J: 0.44, K: 0.76, L: 0.6, M: 0.94, N: 0.8,
      O: 0.78, P: 0.65, Q: 0.78, R: 0.71, S: 0.63, T: 0.66, U: 0.78,
      V: 0.72, W: 1.0, X: 0.72, Y: 0.66, Z: 0.68,
    };
    const name = section.name.toUpperCase();
    const sum = [...name].reduce((total, ch) => total + (ADV[ch] ?? 0.68), 0);
    // Outfit's caps run a touch narrower than Literata's; the fit still
    // happens on the client — this only aims the first paint.
    if (tiles) return 1.03 * sum;
    return 1.03 * sum - 0.015 * (name.length - 1);
  })();
  // 97% of the masthead's own width — the word should end a breath before
  // the edge, the way the branding reference does. The tile band fills the
  // full column and FitWord lands it there exactly.
  const wordSize = tiles
    ? `${(100 / wordEm).toFixed(2)}cqw`
    : `${(97 / wordEm).toFixed(2)}cqw`;

  return (
    <div className="container font-body">
      {/* The desk's cover: the paper's name, the desk word at full width, and
          the Inside ticker with the latest filings. It spans the whole
          container — the cards below return to the reading measure. */}
      <header className={styles.masthead}>
        {!tiles ? (
          <>
            <p className={`${styles.paperName} font-ui`}>The Opinion Weekly</p>
            <FitWord
              initialSize={wordSize}
              className={`${styles.word} font-display`}
            >
              {section.name}
            </FitWord>
          </>
        ) : (
          <FitWord
            initialSize={wordSize}
            className={styles.tilesWord}
            tiles
          >
            {section.name}
          </FitWord>
        )}

        {/* The culture note strip: label, a rule running to the week. */}
        {tiles && (
          <p className={styles.strip}>
            <span className={`${styles.stripLabel} font-display`}>
              {section.brand?.strip}
            </span>
            <span className={styles.stripRule} aria-hidden="true" />
            <span className={`${styles.stripDate} font-ui`}>{weekLabel()}</span>
          </p>
        )}

        {filed.length > 0 ? (
          <nav className={styles.ticker} aria-label={`Inside ${section.name}`}>
            <span className={`${styles.pill} font-ui`}>
              Inside
              <svg
                className={styles.pillArrow}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12h16M13 4l8 8-8 8" />
              </svg>
            </span>
            <div className={styles.window}>
              {/* Two copies of the same list: the track slides by exactly one
                  copy, so the loop's seam is invisible. The repeat is hidden
                  from assistive technology; the real links are heard once. */}
              <ul
                className={styles.track}
                style={{ "--ticker-steps": `${Math.max(filed.length * 5, 16)}s` } as React.CSSProperties}
              >
                {[...filed, ...filed].map((story, index) => (
                  <li
                    key={`${story.id}-${index}`}
                    className={styles.tickerItem}
                    aria-hidden={index >= filed.length || undefined}
                  >
                    <Link
                      href={`/story/${story.slug}`}
                      className={`${styles.tickerLink} font-ui`}
                    >
                      {story.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : (
          <p className={`${styles.tickerStatic} font-ui`}>
            <span className={`${styles.pill} font-ui`}>Inside</span>
            Nothing filed here yet
          </p>
        )}
      </header>

      <div className="measure-center">
        {/* The cards hang off this, so a heading-by-heading reader lands on
            the desk's list rather than dropping straight from h1 to h3. The
            head carried the desk's name and deck; the count line went with
            the old furniture. */}
        <h2 className="visually-hidden">Stories filed under {section.name}</h2>
        {filed.length > 0 ? (
          <>
            {/* A desk with a single filing prints it full measure — a
                half-width card hanging in the left column reads lopsided on
                the narrow reading column, and the full width mirrors how the
                story's own page opens with the cover. */}
            <StoryGrid stories={filed} solo={filed.length === 1} />
          </>
        ) : (
          <p className={`${styles.empty} font-body`}>
            Nothing has been filed under {section.name} yet.{" "}
            <Link href="/signup">Write for us</Link> and make it the first.
          </p>
        )}
      </div>
    </div>
  );
}
