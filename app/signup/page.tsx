"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "./action";
import Feedback from "@/app/Feedback";
import f from "@/app/Form.module.scss";

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
        <div className="measure-center">
          <h1 className={`${f.title} font-display`}>Check your email</h1>
          <p className={`${f.subtitle} text-muted font-ui`}>
            We sent a verification link to{" "}
            <b>{createdEmail}</b>. Open it to activate your account, then sign in.
          </p>
          <p className={`${f.note} font-ui`}>
            <Link href="/login" className={f.link}>
              Go to sign in
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

  return (
    <div className="container font-body">
      <div className="measure-center">
        <h1 className={`${f.title} font-display`}>Create account</h1>
        <p className={`${f.subtitle} text-muted font-ui`}>
          Join as a contributor and submit stories for review.
        </p>
        {error && <Feedback>{error}</Feedback>}
        <form action={createAccount} className={f.form}>
          <div>
            <label htmlFor="name" className={`${f.label} font-ui`}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className={f.input}
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
              className={f.input}
            />
          </div>
          <button disabled={busy} className={`${f.submit} font-ui`}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className={`${f.note} text-muted font-ui`}>
          Already have an account?{" "}
          <Link href="/login" className={f.link}>
            Sign in
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
