"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

/**
 * Site header with live auth state: keeps the server-rendered state while
 * `useSession` resolves (no flash), then switches the Dashboard/Sign-out and
 * Login/Sign-up branches the instant the session changes — including right
 * after sign-out, since server layouts don't re-render on client navigation.
 */
export default function SiteHeader({ initialAuthed }: { initialAuthed: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  const authed = status === "loading" ? initialAuthed : status === "authenticated";

  async function signout() {
    await signOut({ redirect: false });
    router.refresh(); // revalidates server components with the cleared session
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
              className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
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
