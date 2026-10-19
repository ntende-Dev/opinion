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
        <StoryGrid stories={filed} />
      )}
    </div>
  );
}
