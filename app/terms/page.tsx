import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms of writing for and reading The Opinion Weekly — contributions, standards and editorial rights.",
};

export default function Terms() {
  return (
    <div className="container font-body">
      <article className="measure">
        <p className="font-ui text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Information
        </p>
        <h1 className="mt-3 font-display">Terms</h1>
        <p className="mt-4 font-ui text-[var(--step--1)] text-[var(--color-muted)]">
          What you agree to when you write for, or read, this paper.
        </p>

        <div className="prose-content mt-8">
          <h2>Your writing stays yours</h2>

          <p>
            You keep the copyright to everything you write. By filing a story
            you grant The Opinion Weekly permission to publish it here, to
            archive it, and to edit it lightly — for clarity, length and
            accuracy — in consultation with you where it matters.
          </p>

          <h2>What we will not publish</h2>

          <p>
            Work that is plagiarised; work that defames a person; work that
            incites hatred against people for who they are. Argument is
            welcome. Cruelty and fabrication are not, and neither is passing
            someone else&apos;s words off as your own.
          </p>

          <h2>Editorial rights</h2>

          <p>
            Editors decide what is published, when, and under what headline. We
            may decline a piece, hold it, or unpublish it — for instance if it
            turns out to be false or harmful after publication. A published
            piece is not a promise that it stays up forever.
          </p>

          <h2>Your account</h2>

          <p>
            Accounts are personal: keep your password to yourself and do not
            impersonate another writer. You are responsible for the stories
            filed from your account.
          </p>

          <h2>Reading</h2>

          <p>
            The opinions published here belong to their authors and not
            necessarily to the paper or its editors. Everything is offered in
            good faith and without warranty.
          </p>

          <h2>Questions</h2>

          <p>
            If any of this is unclear, or you believe something here has been
            breached, write to the editors on the{" "}
            <Link href="/contact">contact page</Link>. We would rather resolve
            it with you directly.
          </p>
        </div>
      </article>
    </div>
  );
}
