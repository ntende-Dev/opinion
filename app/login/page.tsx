"use client";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Feedback from "@/app/Feedback";
import f from "@/app/Form.module.scss";

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
        <h1 className={`${f.title} font-display`}>Login</h1>
        <p className={`${f.subtitle} text-muted font-ui`}>
          Sign in to the editorial dashboard.
        </p>
        {error && <Feedback kind={kind}>{error}</Feedback>}
        <form action={login} className={f.form}>
          <div>
            <label htmlFor="email" className={`${f.label} font-ui`}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={f.input}
            />
          </div>
          <div>
            <label htmlFor="password" className={`${f.label} font-ui`}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={f.input}
            />
          </div>
          <button disabled={busy} className={`${f.submit} font-ui`}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className={`${f.note} text-muted font-ui`}>
          The opinionated editorial dashboard is a work in progress. If you
          have any questions or feedback, please reach out to{" "}
          <Link href="mailto:mvenda@opinionweekly.co.za" className={f.link}>
            mvenda@opinionweekly.co.za
          </Link>
        </p>
        <p className={`${f.noteTight} font-ui`}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className={f.link}>
            Create one
          </Link>
        </p>
        <p className={`${f.noteTight} font-ui`}>
          <Link href="/" className={f.link}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
