import type { Metadata } from "next";
import Link from "next/link";
import e from "@/app/Editorial.module.scss";

export const metadata: Metadata = {
  title: "About",
  description:
    "The Opinion Weekly is an independent journal of editorial argument — essays, rebuttals and dispatches from writers willing to commit to a position.",
};

export default function About() {
  return (
    <div className="container font-body">
      <article className="measure">
        <p className={`${e.eyebrow} font-ui`}>
          The paper
        </p>
        <h1 className={`${e.title} font-display`}>About The Opinion Weekly</h1>

        <div className={`${e.body} prose-content`}>
          <p>
            The Opinion Weekly is an independent journal of editorial argument.
            We publish essays, rebuttals and dispatches from writers who are
            willing to commit to a position and defend it in public — the kind
            of writing that takes a side and then earns it.
          </p>

          <p>
            We are not a news wire. Everything here is argument: a point of
            view, made plainly, in a form short enough to read over a cup of
            coffee and strong enough to argue with at dinner.
          </p>

          <h2>How the paper is made</h2>

          <p>
            Contributors write and file their pieces through the site. Nothing
            appears on the front page until an editor has read it, worked with
            the writer, and published it by hand. That deliberately slow middle
            step is the whole editorial method: no automatic publishing, no
            unread corners of the internet dressed up as a journal.
          </p>

          <p>
            Every published piece carries its author&apos;s name. Opinions are
            the writers&apos; own — the paper&apos;s job is to hold them to a
            standard, not to hold them all in common.
          </p>

          <h2>Writing for us</h2>

          <p>
            We are open to new voices. If you have something to argue, create
            an account and file a draft — you keep your words, and an editor
            will read what you send. Pitches, corrections and letters to the
            editor are equally welcome.
          </p>

          <p>
            <Link href="/signup">Create an account</Link> to start writing, or{" "}
            <Link href="/contact">write to the editors</Link> first if you would
            rather talk it through.
          </p>
        </div>
      </article>
    </div>
  );
}
