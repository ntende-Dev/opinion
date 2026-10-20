"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SectionId } from "@/lib/sections";
import styles from "./SiteHeader.module.scss";

type Profile = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

type NavSection = { id: SectionId; name: string };

/**
 * How many desks stay in the section row before the rest move behind More.
 * The paper has seven desks and they fit the row side by side down to $bp-md,
 * so all seven print; the limit is the overflow guard for anything filed
 * beyond the current taxonomy, not a cap on the desks we already run.
 */
const ROW_LIMIT = 7;

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Native `<details>` toggles by keyboard and works before React hydrates; this
 * adds the two things it lacks — closing on Escape and on a click outside —
 * without taking the disclosure away from the browser.
 */
function useDismissableDetails(ref: React.RefObject<HTMLDetailsElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (el.open && e.target instanceof Node && !el.contains(e.target)) {
        el.open = false;
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !el.open) return;
      el.open = false;
      (el.querySelector("summary") as HTMLElement | null)?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref]);
}

/** Leaderboard ad just below the masthead, for readers who are not signed
 *  in. The strip is held to a fixed
 *  100px so the masthead has a stable, predictable rhythm, with the 728×90
 *  creative (displayed at a modest 600px cap) centred inside it. next/image
 *  serves it as compressed WebP/AVIF per device. */
function AdBanner() {
  return (
    <aside className={styles.adStrip} aria-label="Advertisement">
      <Image
        src="/images/topBanner.png"
        alt="Advertisement"
        width={728}
        height={90}
        priority
        className={styles.ad}
      />
    </aside>
  );
}

/** Hamburger icon — drawn, three bars that become an X when open. */
function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ) : (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

/**
 * The masthead's search. In the section row it is an always-visible field —
 * the magnifier is its submit button, sweeping once when the reader reaches
 * for it — and the mobile panel stretches the same field full width. Either
 * way it is a plain GET form to /search, which is where the results live.
 */
function SearchField({
  variant,
  onSubmit,
}: {
  variant: "bar" | "panel";
  onSubmit?: () => void;
}) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      aria-label="Search the paper"
      className={
        variant === "bar" ? styles.searchForm : styles.panelSearch
      }
      onSubmit={() => onSubmit?.()}
    >
      <button type="submit" className={styles.searchIcon} aria-label="Search">
        <SearchIcon />
      </button>
      <input
        type="search"
        name="q"
        placeholder="Search the paper…"
        aria-label="Search the paper"
        className={`${styles.searchInput} font-ui`}
      />
    </form>
  );
}

/**
 * Avatar, name, role chip and email. The masthead shows this from md up (with
 * the name column appearing at xl); the mobile panel shows a full-width
 * variant under a hairline.
 */
function ProfileBlock({
  profile,
  inPanel = false,
}: {
  profile: Profile;
  inPanel?: boolean;
}) {
  return (
    <div className={inPanel ? styles.panelProfile : styles.profile}>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt=""
          width={36}
          height={36}
          className={styles.avatar}
        />
      ) : (
        <span aria-hidden="true" className={styles.avatarFallback}>
          {initials(profile.name)}
        </span>
      )}
      <span className={inPanel ? styles.panelProfileText : styles.profileText}>
        <span className={styles.profileName}>
          {profile.name}
          <span className={styles.role}>{profile.role}</span>
        </span>
        <span className={styles.profileEmail}>{profile.email}</span>
      </span>
    </div>
  );
}

/**
 * Masthead, in two tiers. Tier one carries the paper's mark, search and the
 * account actions; tier two carries the section row — Home plus every desk
 * that has something published, with the overflow behind More. A desk with
 * nothing filed yet is deliberately absent, so no link lands a reader on an
 * empty page (the page itself still exists at /section/<id>).
 *
 * The section list arrives from the root layout, which reads it off the
 * published stories. Below md the row gives way to the hamburger panel, which
 * repeats the sections and keeps search one tap away.
 *
 * Styling lives in SiteHeader.module.scss — no Tailwind utilities.
 */
export default function SiteHeader({
  initialAuthed,
  sections,
}: {
  initialAuthed: boolean;
  sections: NavSection[];
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [signedOut, setSignedOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const authed =
    !signedOut &&
    (status === "authenticated"
      ? true
      : status === "unauthenticated"
        ? false
        : initialAuthed);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileTick, setProfileTick] = useState(0);

  const more = useRef<HTMLDetailsElement>(null);
  useDismissableDetails(more);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const panelTimer = useRef<number | null>(null);

  /**
   * The panel leaves on the same short exit the story dialog uses (160ms,
   * mirroring --dur-fast) instead of blinking out the moment the button is
   * pressed. A reader who asked for less motion is spared the wait.
   */
  const closeMenu = () => {
    if (!menuOpen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMenuOpen(false);
      return;
    }
    setPanelClosing(true);
    if (panelTimer.current) window.clearTimeout(panelTimer.current);
    panelTimer.current = window.setTimeout(() => {
      setMenuOpen(false);
      setPanelClosing(false);
      panelTimer.current = null;
    }, 160);
  };

  useEffect(
    () => () => {
      if (panelTimer.current) window.clearTimeout(panelTimer.current);
    },
    [],
  );

  /**
   * The mobile panel is a navigation disclosure, so it behaves like the
   * `<details>` ones: Escape closes it and hands focus back to the button that
   * opened it, and focus lands inside the panel on open rather than being left
   * behind in the masthead.
   */
  useEffect(() => {
    if (!menuOpen) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMenu();
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const onProfileUpdate = () => setProfileTick((t) => t + 1);
    window.addEventListener("profile-updated", onProfileUpdate);
    return () => window.removeEventListener("profile-updated", onProfileUpdate);
  }, []);

  /**
   * The masthead compresses once the reader has left the hero behind, and
   * releases again near the top. The two thresholds are deliberately far
   * apart — hysteresis — so a reader pacing at the boundary never sees the
   * bar thrash between its two sizes. One passive listener, coalesced into a
   * single frame per scroll burst, the same discipline the progress rule uses.
   */
  const [compressed, setCompressed] = useState(false);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      setCompressed((current) => (current ? y > 40 : y > 140));
    };
    const request = () => {
      // A hidden tab never paints, and a queued animation frame never runs
      // there — the compression would freeze until the reader returns. When
      // the document is hidden, measure synchronously instead.
      if (document.hidden) {
        measure();
        return;
      }
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", request, { passive: true });
    return () => {
      window.removeEventListener("scroll", request);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Profile | null) => {
        if (!cancelled) setProfile(p);
      });
    return () => {
      cancelled = true;
    };
  }, [status, profileTick]);

  async function signout() {
    // Flip the header in the same render tick — the Dashboard link and the
    // profile block vanish immediately, before the network roundtrip lands.
    setSignedOut(true);
    setProfile(null);
    setMenuOpen(false);
    await signOut({ redirect: false }); // CSRF-safe cookie clear
    router.refresh();
    router.push("/");
    toast.success("You've been signed out.");
  }

  const isHome = pathname === "/";
  const currentSection =
    pathname.startsWith("/section/") ? pathname.split("/")[2] : null;
  const inRow = sections.slice(0, ROW_LIMIT);
  const behindMore = sections.slice(ROW_LIMIT);

  const sectionLink = (id: SectionId, name: string, onNavigate?: () => void) => {
    const active = currentSection === id;
    return (
      <Link
        href={`/section/${id}`}
        className={`${styles.sectionLink} ${active ? styles.sectionLinkActive : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        {name}
      </Link>
    );
  };

  return (
    <>
      {/* The header IS the bar that stays with the reader. It is sticky
          against the body, which spans the whole page — a sticky element can
          only ever pin while its parent is on screen, so the parent must be
          the document, not a bar-sized wrapper. The ad strip stays outside,
          in ordinary flow, and the compressed class lives on this element so
          its shadow can paint at the pinned edge. */}
      <header
        className={`${styles.header} ${compressed ? styles.compressed : ""}`}
        data-print="hide"
      >
        {/* Tier one — the masthead: mark, then the paper's utilities. */}
        <div className={styles.masthead}>
        <Link
          href="/"
          aria-label="The Opinion Weekly — home"
          className={styles.logoLink}
        >
          {/* No width/height here on purpose: the logo's own ratio must be
              what lays it out, whatever size the file is cut to. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/opinionLogo.svg" alt="" className={styles.logo} />
        </Link>

        <div className={styles.tools}>
          {authed ? (
            <>
              {profile && <ProfileBlock profile={profile} />}
              <Link
                href="/dashboard"
                className={`${styles.link} ${styles.desktopInline}`}
              >
                Dashboard
              </Link>
              <button
                onClick={signout}
                className={`${styles.accentButton} ${styles.desktopInlineFlex}`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`${styles.link} ${styles.desktopInline}`}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className={`${styles.accentButton} ${styles.desktopInlineFlex}`}
              >
                Sign up
              </Link>
            </>
          )}

          <button
            type="button"
            ref={menuButtonRef}
            className={styles.menuButton}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "mobile-menu" : undefined}
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Tier two — the section row: the desks, and the search at its end. */}
      <nav className={styles.sectionBar} aria-label="Sections">
        <ul className={styles.sectionList}>
          <li>
            <Link
              href="/"
              className={`${styles.sectionLink} ${isHome ? styles.sectionLinkActive : ""}`}
              aria-current={isHome ? "page" : undefined}
            >
              Home
            </Link>
          </li>
          {inRow.map((section) => (
            <li key={section.id}>
              {sectionLink(section.id, section.name)}
            </li>
          ))}
          {behindMore.length > 0 && (
            <li>
              <details className={styles.more} ref={more}>
                <summary className={styles.moreToggle}>
                  More
                  <CaretIcon />
                </summary>
                <ul className={styles.moreList}>
                  {behindMore.map((section) => (
                    <li key={section.id}>
                      {sectionLink(section.id, section.name, () => {
                        if (more.current) more.current.open = false;
                      })}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )}
        </ul>

        <div className={styles.sectionSearch}>
          <SearchField variant="bar" />
        </div>
        </nav>

        {/* Mobile drop-down panel. */}
        {menuOpen && (
          <nav
            id="mobile-menu"
            ref={panelRef}
            tabIndex={-1}
            /* Still mounted while it leaves, so it must not take a tap or a
               tab stop on the way out. */
            inert={panelClosing}
            className={`${styles.panel} ${panelClosing ? styles.panelClosing : ""}`}
          >
            {authed && profile && <ProfileBlock profile={profile} inPanel />}
            <SearchField variant="panel" onSubmit={closeMenu} />
            <Link href="/" className={styles.link} onClick={closeMenu}>
              Home
            </Link>
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/section/${section.id}`}
                className={`${styles.link} ${currentSection === section.id ? styles.panelLinkActive : ""}`}
                aria-current={currentSection === section.id ? "page" : undefined}
                onClick={closeMenu}
              >
                {section.name}
              </Link>
            ))}
            <Link href="/contact" className={styles.link} onClick={closeMenu}>
              Contact
            </Link>
            {authed ? (
              <>
                <Link href="/dashboard" className={styles.link} onClick={closeMenu}>
                  Dashboard
                </Link>
                <button onClick={signout} className={styles.panelButton}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.link} onClick={closeMenu}>
                  Login
                </Link>
                <Link
                  href="/signup"
                  className={styles.panelButton}
                  onClick={closeMenu}
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        )}
      </header>

      {/* The ad strip is for readers only — signed-in members of the paper
          never see it, so it stays out of their reading column too. It sits
          outside the header, so it scrolls away like print rather than
          pinning with the bar. */}
      {!authed && <AdBanner />}
    </>
  );
}
