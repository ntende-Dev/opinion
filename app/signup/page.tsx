"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "./action";
import Feedback from "@/app/Feedback";

export default function Signup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");

  async function createAccount(formData: FormData) {
    setBusy(true);
    setError("");
    setCreated(false);

    const result = await signup(formData);

    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }

    setCreated(true);
    setCreatedEmail(result.email ?? "");
  }

  if (created) {
    return (
      <div className="container font-body">
        <div className="measure">
          <h1 className="font-display mb-2">Check your email</h1>
          <p className="mt-2 text-muted font-ui text-sm">
            We sent a verification link to{" "}
            <b>{createdEmail}</b>. Open it to activate your account, then sign in.
          </p>
          <p className="mt-6 text-sm font-ui">
            <Link
              href="/login"
              className="underline underline-offset-2 hover:no-underline"
            >
              Go to sign in
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

  return (
    <div className="container font-body">
      <div className="measure">
        <h1 className="font-display mb-2">Create account</h1>
        <p className="mt-2 text-muted font-ui text-sm">
          Join as a contributor and submit stories for review.
        </p>
        {error && <Feedback>{error}</Feedback>}
        <form action={createAccount} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
              className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <button
            disabled={busy}
            className="rounded bg-[var(--color-accent)] px-4 py-2 text-white font-ui font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted font-ui">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-2 hover:no-underline"
          >
            Sign in
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
