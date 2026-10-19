import Link from "next/link";
import { SITE, SOCIALS } from "@/lib/site";

const colLink =
  "font-ui text-[var(--step--1)] text-[var(--color-muted)] no-underline transition-colors hover:text-[var(--color-accent)]";

/** Column heading — small caps sans, held above the global serif h2 scale. */
function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="font-ui text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink)]">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </nav>
  );
}

/**
 * Site footer — the paper's colophon. Four columns over a heavy rule: the
 * masthead with its socials, then the three navigable indexes (the paper,
 * writing for it, and the legal/feed information). Every destination here
 * is a real page; the account column follows the live session so it never
 * offers a link a reader can't use.
 */
export default function Footer({ isAuthed }: { isAuthed: boolean }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t-2 border-[var(--color-ink)] px-6 pb-10 pt-12">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Masthead */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="font-display text-[var(--step-2)] font-semibold no-underline text-[var(--color-ink)]"
            >
              {SITE.name}
              <span className="text-[var(--color-accent)]">.</span>
            </Link>
            <p className="mt-3 max-w-xs font-body text-[var(--step--1)] leading-relaxed text-[var(--color-muted)] no-underline">
              {SITE.description}
            </p>
            <ul className="mt-5 flex items-center gap-2.5">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-muted)] no-underline transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d={s.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* The paper */}
          <Column title="The Paper">
            <li>
              <Link href="/#latest" className={colLink}>
                Latest stories
              </Link>
            </li>
            <li>
              <Link href="/about" className={colLink}>
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className={colLink}>
                Contact
              </Link>
            </li>
            <li>
              <a href="/feed.xml" className={colLink}>
                RSS feed
              </a>
            </li>
          </Column>

          {/* Writers */}
          <Column title="Write">
            <li>
              <Link href="/signup" className={colLink}>
                Become a contributor
              </Link>
            </li>
            <li>
              <Link href={isAuthed ? "/dashboard" : "/login"} className={colLink}>
                {isAuthed ? "Your dashboard" : "Sign in"}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/write" className={colLink}>
                File a story
              </Link>
            </li>
          </Column>

          {/* Information */}
          <Column title="Information">
            <li>
              <Link href="/privacy" className={colLink}>
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={colLink}>
                Terms
              </Link>
            </li>
            <li>
              <Link href="/contact" className={colLink}>
                Advertise
              </Link>
            </li>
          </Column>
        </div>

        {/* Colophon */}
        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-ui text-[0.7rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            © {year} {SITE.name} · All opinions are the authors&apos; own.
          </p>
          <p className="font-body text-[0.75rem] italic text-[var(--color-muted)]">
            {SITE.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
