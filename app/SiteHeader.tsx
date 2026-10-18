"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

/**
 * Animated navbar logo: the Remotion-rendered alpha webm (see
 * remotion-logo/) loops once every 7s — a short entrance, then a long hold.
 * The static opinionLogo.svg rides along as the poster, so browsers without
 * webm (Safari) show the still logo instead. Users who prefer reduced
 * motion get the still logo paused on its final frame.
 */
function LogoMark() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (media.matches) video.pause();
      else video.play().catch(() => {});
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return (
    <video
      ref={ref}
      src="/opinion-logo.webm"
      poster="/opinionLogo.svg"
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      className="block h-[50px] w-auto"
    />
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

const linkBase =
  "font-ui text-sm font-medium hover:underline decoration-2 underline-offset-4";

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
    <header className="mb-10 border-b border-[var(--color-line)] px-6">
      <div className="relative flex items-center justify-between gap-4 pt-1 pb-5">
        {/* Left — page links (desktop). Mobile gets these in the panel. */}
        <nav className="hidden md:flex items-center gap-5">
          <Link href="/" className={linkBase}>
            Home
          </Link>
          <Link href="/contact" className={linkBase}>
            Contact
          </Link>
          {authed && (
            <Link href="/dashboard" className={linkBase}>
              Dashboard
            </Link>
          )}
        </nav>
        {/* Spacer so flex space-between keeps the logo truly central even
            when the left nav is hidden on mobile. */}
        <span className="md:hidden" aria-hidden="true" />

        {/* Center — the logo, justified center of the bar. */}
        <Link
          href="/"
          aria-label="The Opinion Weekly — home"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
        >
          <LogoMark />
        </Link>

        {/* Right — account actions. */}
        <div className="flex items-center gap-3">
          {authed ? (
            <>
              {profile && (
                <div className="hidden md:flex items-center gap-2">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover border border-[var(--color-line)]"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-display font-bold text-sm"
                    >
                      {initials(profile.name)}
                    </span>
                  )}
                  <span className="hidden xl:flex flex-col leading-tight">
                    <span className="font-ui text-sm font-normal text-[var(--color-ink)]">
                      {profile.name}
                      <span className="ml-1.5 rounded-full border border-[var(--color-line)] px-1.5 py-px text-[11px] font-medium text-[var(--color-muted)]">
                        {profile.role}
                      </span>
                    </span>
                    <span className="font-ui text-[11px] text-[var(--color-muted)]">
                      {profile.email}
                    </span>
                  </span>
                </div>
              )}
              <button
                onClick={signout}
                className="hidden md:inline-flex font-ui text-sm rounded bg-[var(--color-accent)] px-3 py-1.5 text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${linkBase} hidden md:inline`}>
                Login
              </Link>
              <Link
                href="/signup"
                className="hidden md:inline-flex font-ui text-sm rounded bg-[var(--color-accent)] px-3 py-1.5 text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            className="md:hidden p-2 -mr-2 rounded hover:bg-[var(--color-line)] transition-colors"
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
        <nav
          id="mobile-menu"
          className="md:hidden flex flex-col items-start gap-4 pt-3 pb-5"
        >
          {authed && profile && (
            <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-line)] w-full">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover border border-[var(--color-line)]"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-display font-bold text-sm"
                >
                  {initials(profile.name)}
                </span>
              )}
              <span className="font-ui flex flex-col leading-tight">
                <span className="text-sm font-normal text-[var(--color-ink)]">
                  {profile.name}
                  <span className="ml-1.5 rounded-full border border-[var(--color-line)] px-1.5 py-px text-[11px] font-medium text-[var(--color-muted)]">
                    {profile.role}
                  </span>
                </span>
                <span className="text-[11px] text-[var(--color-muted)]">
                  {profile.email}
                </span>
              </span>
            </div>
          )}
          <Link href="/" className={linkBase} onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/contact" className={linkBase} onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
          {authed ? (
            <>
              <Link
                href="/dashboard"
                className={linkBase}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={signout}
                className="self-stretch rounded bg-[var(--color-accent)] px-3 py-2 text-sm font-ui text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={linkBase}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="self-stretch rounded bg-[var(--color-accent)] px-3 py-2 text-sm font-ui text-white text-center hover:bg-[var(--color-accent-hover)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
