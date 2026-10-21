import type { Metadata } from "next";
import Link from "next/link";
import { SECTIONS } from "@/lib/sections";
import e from "@/app/Editorial.module.scss";

export const metadata: Metadata = {
  title: "This page has been spiked",
  description:
    "The page asked for is not in print — retired, misfiled or never written. The front page, the desks and the paper's search are all a step away.",
};

export default function NotFound() {
  return (
    <div className="container font-body">
      <article className="measure-center">
        <p className={`${e.eyebrow} font-ui`}>Not found</p>
        <h1 className={`${e.title} font-display`}>
          This page has been spiked
        </h1>
        <p className={`${e.standfirst} font-body`}>
          Every newsroom keeps a spike for copy that will never run. Whatever
          this address was meant to hold is one of those: retired, misfiled, or
          never written.
        </p>

        <div className={`${e.body} prose-content`}>
          <p>It may still be on the slate:</p>
          <ul>
            <li>
              Read the <Link href="/">front page</Link> — the latest filings,
              newest first.
            </li>
            <li>
              <Link href="/search">Search the paper</Link> for a piece by its
              words.
            </li>
            <li>
              Go straight to a desk:{" "}
              {SECTIONS.map((section, index) => (
                <span key={section.id}>
                  <Link href={`/section/${section.id}`}>{section.name}</Link>
                  {index < SECTIONS.length - 1 ? ", " : null}
                </span>
              ))}
              .
            </li>
          </ul>
          <p>
            If a page used to live here and should again,{" "}
            <Link href="/contact">write to the editors</Link> and make the case.
          </p>
        </div>
      </article>
    </div>
  );
}
