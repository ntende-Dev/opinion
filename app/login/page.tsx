"use client";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Feedback from "@/app/Feedback";

// Mirrors the thrown message in auth.ts (can't import auth.ts into a client component).
const UNVERIFIED_ERROR = "Please verify your email before signing in.";

const VERIFY_ERRORS: Record<string, string> = {
  "missing-verification-token": "Missing verification token.",
  "invalid-or-expired-verification-token":
    "Invalid or expired verification token. Request a new account confirmation.",
};

export default function Login() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const verified = searchParams.get("verified");
    const err = searchParams.get("error");
    if (verified === "1") {
      setKind("success");
      setError("Your email is verified. You can now sign in.");
    } else if (err && VERIFY_ERRORS[err]) {
      setKind("error");
      setError(VERIFY_ERRORS[err]);
    }
  }, [searchParams]);

  async function login(formData: FormData) {
    setBusy(true);
    setError("");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setBusy(false);
    if (result?.error) {
      setError(
        result.error === UNVERIFIED_ERROR
          ? "Please verify your email first — check your inbox for the verification link."
          : "Invalid email or password",
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container font-body">
      <div className="measure">
        <h1 className="font-display mb-2">Login</h1>
        <p className="mt-2 text-muted font-ui text-sm">
          Sign in to the editorial dashboard.
        </p>
        {error && <Feedback kind={kind}>{error}</Feedback>}
        <form action={login} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <button
            disabled={busy}
            className="rounded bg-[var(--color-accent)] px-4 py-2 text-white font-ui font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted font-ui">
          Try <b>admin@example.com / admin123</b> or{" "}
          <b>contributor@example.com / contributor123</b>.
        </p>
        <p className="mt-4 text-sm font-ui">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="underline underline-offset-2 hover:no-underline"
          >
            Create one
          </Link>
        </p>
        <p className="mt-4 text-sm font-ui">
          <Link
            href="/"
            className="underline underline-offset-2 hover:no-underline"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
