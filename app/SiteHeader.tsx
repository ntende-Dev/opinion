"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import styles from "./SiteHeader.module.scss";

type Profile = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

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

/** Leaderboard ad just below the navbar. The strip is held to a fixed
 *  100px so the masthead has a stable, predictable rhythm, with the 728×90
 *  creative (displayed at a modest 600px cap) centred inside it. next/image
 *  serves it as compressed WebP/AVIF per device. */
function AdBanner() {
  return (
    <div className={styles.adStrip} aria-label="Advertisement">
      <Image
        src="/images/topBanner.png"
        alt="Advertisement"
        width={728}
        height={90}
        priority
        className={styles.ad}
      />
    </div>
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

/**
 * Avatar, name, role chip and email. The desktop bar shows this from `md`
 * up (with the name column appearing at `xl`); the mobile panel shows a
 * full-width variant under a hairline.
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
        <img src={profile.avatarUrl} alt="" className={styles.avatar} />
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
 * Site header with live auth state. The client session decides auth; the
 * profile block (avatar, name, role, email) is fetched from /api/me while
 * signed in and stays there for as long as the session exists — sign-out
 * clears both at once. Avatar changes anywhere in the app re-broadcast the
 * `profile-updated` event to refresh this block immediately.
 *
 * Layout: padded full-width bar, navigation links on the left, the logo
 * absolutely centered on the bar (the content column is `mx-auto`, so this
 * is the same visual center as the page), and account actions on the right.
 * Below md everything moves into the hamburger panel.
 *
 * Styling lives in SiteHeader.module.scss — no Tailwind utilities.
 */
export default function SiteHeader({ initialAuthed }: { initialAuthed: boolean }) {
  const { status } = useSession();
  const router = useRouter();
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

  useEffect(() => {
    const onProfileUpdate = () => setProfileTick((t) => t + 1);
    window.addEventListener("profile-updated", onProfileUpdate);
    return () => window.removeEventListener("profile-updated", onProfileUpdate);
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

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {/* Left — page links (desktop). Mobile gets these in the panel. */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.link}>
            Home
          </Link>
          <Link href="/contact" className={styles.link}>
            Contact
          </Link>
          {authed && (
            <Link href="/dashboard" className={styles.link}>
              Dashboard
            </Link>
          )}
        </nav>
        {/* Spacer so flex space-between keeps the logo truly central even
            when the left nav is hidden on mobile. */}
        <span className={styles.spacer} aria-hidden="true" />

        {/* Center — the logo, justified center of the bar. Static by
            request: the same SVG, larger, with no animation. `inset-block: 0`
            plus centring pins it to the bar's true vertical centre regardless
            of how the SVG measures itself. */}
        <Link
          href="/"
          aria-label="The Opinion Weekly — home"
          className={styles.logoLink}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/opinionLogo.svg" alt="" className={styles.logo} />
        </Link>

        {/* Right — account actions. */}
        <div className={styles.account}>
          {authed ? (
            <>
              {profile && <ProfileBlock profile={profile} />}
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
            className={styles.menuButton}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile drop-down panel. */}
      {menuOpen && (
        <nav id="mobile-menu" className={styles.panel}>
          {authed && profile && <ProfileBlock profile={profile} inPanel />}
          <Link href="/" className={styles.link} onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/contact" className={styles.link} onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
          {authed ? (
            <>
              <Link
                href="/dashboard"
                className={styles.link}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button onClick={signout} className={styles.panelButton}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={styles.link}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className={styles.panelButton}
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}

      {/* Dummy ad strip lives under the navbar, above the closing rule. */}
      <AdBanner />
    </header>
  );
}
