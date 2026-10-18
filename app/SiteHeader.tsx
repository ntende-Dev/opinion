"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

/**
 * Site header with live auth state. The client session is the single source
 * of truth once it resolves; the server-derived `initialAuthed` is trusted
 * only for the pre-resolution paint (SSR + hydration) so there is no layout
 * shift and no wrong branch while `useSession` is loading. After sign-out the
 * context flips to "unauthenticated" immediately, so the Dashboard link and
 * Sign out button never linger for a signed-out visitor.
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

  async function signout() {
    await signOut({ redirect: false });
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
