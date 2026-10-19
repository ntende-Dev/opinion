import Link from "next/link";
import { SITE, SOCIALS } from "@/lib/site";
import styles from "./Footer.module.scss";

const colLink = `${styles.columnLink} font-ui`;

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
      <h2 className={`${styles.columnTitle} font-ui`}>{title}</h2>
      <ul className={styles.columnList}>{children}</ul>
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
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Masthead */}
          <div className={styles.mastheadColumn}>
            <Link
              href="/"
              className={`${styles.masthead} font-display`}
            >
              {SITE.name}
              <span className={styles.mastheadStop}>.</span>
            </Link>
            <p className={`${styles.blurb} font-body`}>{SITE.description}</p>
            <ul className={styles.socials}>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className={styles.social}
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
        <div className={styles.colophon}>
          <p className={`${styles.copyright} font-ui`}>
            © {year} {SITE.name} · All opinions are the authors&apos; own.
          </p>
          <p className={`${styles.tagline} font-body`}>{SITE.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
