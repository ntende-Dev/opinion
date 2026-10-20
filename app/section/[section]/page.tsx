import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StoryGrid from "@/app/StoryGrid";
import { sectionById, type SectionId } from "@/lib/sections";
import { listPublishedStories } from "@/lib/stories";
import styles from "./Section.module.scss";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ section: string }> };

/** One query per request even though metadata and the page both need it. */
const filedUnder = cache((section: SectionId) =>
  listPublishedStories({ section }),
);

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

  return (
    <div className="container font-body">
      {/* The desk reads on the same centered column as a story page —
          DESIGN.md "Centered single column" — so a desk's header and its
          cards share the centre line the masthead sets. */}
      <div className="measure-center">
        <header className={styles.head}>
          <p className={`${styles.count} font-ui`}>
            {filed.length === 1
              ? "One story filed here"
              : `${filed.length} stories filed here`}
          </p>
          <h1 className="font-display">{section.name}</h1>
          <p className={styles.deck}>{section.deck}</p>
        </header>

        {filed.length === 0 ? (
          <p className={`${styles.empty} font-body`}>
            Nothing has been filed under {section.name} yet.{" "}
            <Link href="/signup">Write for us</Link> and make it the first.
          </p>
        ) : (
          <>
            {/* The cards hang off this, so a heading-by-heading reader lands
                on the desk's list rather than dropping straight from h1 to
                h3. */}
            <h2 className="visually-hidden">
              Stories filed under {section.name}
            </h2>
            {/* A desk with a single filing prints it full measure — a
                half-width card hanging in the left column reads lopsided on
                the narrow reading column, and the full width mirrors how the
                story's own page opens with the cover. */}
            <StoryGrid stories={filed} solo={filed.length === 1} />
          </>
        )}
      </div>
    </div>
  );
}
