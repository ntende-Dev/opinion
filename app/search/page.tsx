import type { Metadata } from "next";
import Link from "next/link";
import StoryGrid from "@/app/StoryGrid";
import { searchPublishedStories } from "@/lib/stories";
import styles from "./Search.module.scss";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every story The Opinion Weekly has filed.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").trim().slice(0, 120);
  const results = query ? await searchPublishedStories(query) : [];

  return (
    <div className="container font-body">
      <header className={styles.head}>
        <h1 className="font-display">Search</h1>
        <form action="/search" method="get" role="search" className={styles.form}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name, place or phrase"
            aria-label="Search stories"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className={`${styles.input} font-ui`}
          />
          <button type="submit" className={`${styles.submit} font-ui`}>
            Search
          </button>
        </form>
      </header>

      {!query ? (
        <p className={`${styles.note} font-body`}>
          Search every headline, deck and line the paper has filed.
        </p>
      ) : results.length === 0 ? (
        <p className={`${styles.note} font-body`}>
          Nothing filed matches <q>{query}</q>. Try a shorter phrase, or{" "}
          <Link href="/">start from the front page</Link>.
        </p>
      ) : (
        <>
          <p className={`${styles.count} font-ui`}>
            {results.length === 1 ? "One story" : `${results.length} stories`}{" "}
            matching <q>{query}</q>
          </p>
          <StoryGrid stories={results} />
        </>
      )}
    </div>
  );
}
