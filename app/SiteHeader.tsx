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
      className="block h-10 w-auto"
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

/**
 * Site header with live auth state. The client session decides auth; the
 * profile block (avatar, name, role, email) is fetched from /api/me while
 * signed in and stays there for as long as the session exists — sign-out
 * clears both at once. Avatar changes anywhere in the app re-broadcast the
 * `profile-updated` event to refresh this block immediately.
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

  const navLinks = (
    close: () => void,
    linkClass = "hover:underline"
  ) => (
    <>
      <Link href="/" className={linkClass} onClick={close}>
        Home
      </Link>
      <Link href="/contact" className={linkClass} onClick={close}>
        Contact
      </Link>
      {authed ? (
        <>
          <Link href="/dashboard" className={linkClass} onClick={close}>
            Dashboard
          </Link>
          {profile && (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-line)]">
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
              <span className="hidden sm:flex flex-col leading-tight">
                <span className="font-normal text-[var(--color-ink)]">
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
          <button
            onClick={signout}
            className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className={linkClass} onClick={close}>
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            onClick={close}
          >
            Sign up
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="mb-10 border-b border-[var(--color-line)]">
      <div className="flex items-center justify-between pb-5 pt-1">
        <Link
          href="/"
          aria-label="The Opinion Weekly — home"
          className="flex items-center"
        >
          <LogoMark />
        </Link>
        <div className="flex items-center gap-2">
          <nav className="hidden md:flex font-ui text-sm font-medium items-center gap-4">
            {navLinks(() => {})}
          </nav>
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
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden flex flex-col items-start gap-4 font-ui text-base font-medium pt-3 pb-5"
        >
          {navLinks(() => setMenuOpen(false))}
        </nav>
      )}
    </header>
  );
}
