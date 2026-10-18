"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
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
 * Site header with live auth state. The client session decides auth; the
 * profile block (avatar, name, role, email) is fetched from /api/me while
 * signed in and stays there for as long as the session exists — sign-out
 * clears both at once. Avatar changes anywhere in the app re-broadcast the
 * `profile-updated` event to refresh this block immediately.
 */
export default function SiteHeader({ initialAuthed }: { initialAuthed: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  const authed =
    status === "authenticated"
      ? true
      : status === "unauthenticated"
        ? false
        : initialAuthed;
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
    await signOut({ redirect: false });
    setProfile(null);
    router.refresh();
    router.push("/");
    toast.success("You've been signed out.");
  }

  return (
    <header className="mb-10 flex items-center justify-between border-b border-[var(--color-line)] pb-4">
      <Link href="/" className="font-ui text-xl font-bold tracking-tight">
        The Opinion Weekly
      </Link>
      <nav className="font-ui text-sm font-medium flex items-center gap-4">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/contact" className="hover:underline">
          Contact
        </Link>
        {authed ? (
          <>
            <Link href="/dashboard" className="hover:underline">
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
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
