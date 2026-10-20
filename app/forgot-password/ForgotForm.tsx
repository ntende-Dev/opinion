"use client";
import { useState } from "react";
import Link from "next/link";
import { requestReset } from "./action";
import Feedback from "@/app/Feedback";
import f from "@/app/Form.module.scss";

/**
 * One field, one outcome. The response never says whether the address is
 * registered — a signed-up reader gets the same screen as a stranger — so the
 * confirmation copy is deliberately about "that address" rather than "your
 * account".
 */
export function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  async function ask(formData: FormData) {
    setBusy(true);
    setSentEmail(String(formData.get("email") ?? ""));
    await requestReset(formData);
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="container font-body">
        <div className="measure-center">
          <h1 className={`${f.title} font-display`}>Check your email</h1>
          <p className={`${f.subtitle} text-muted font-ui`}>
            If an account exists for <b>{sentEmail}</b>, a link to set a new
            password is on its way. It expires in 1 hour.
          </p>
          <p className={`${f.note} text-muted font-ui`}>
            Don&apos;t see it? Wait a minute — the paper only sends one link
            per minute per address — then try again from the{" "}
            <Link href="/forgot-password" className={f.link}>
              forgot password
            </Link>{" "}
            page.
          </p>
          <p className={`${f.noteTight} font-ui`}>
            <Link href="/login" className={f.link}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container font-body">
      <div className="measure-center">
        <h1 className={`${f.title} font-display`}>Forgot password</h1>
        <p className={`${f.subtitle} text-muted font-ui`}>
          Enter the email you signed up with and we&apos;ll send a link to set
          a new password.
        </p>
        <form action={ask} className={f.form}>
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
          <button disabled={busy} className={`${f.submit} font-ui`}>
            {busy ? "Sending." : "Send reset link"}
          </button>
        </form>
        <p className={`${f.noteTight} font-ui`}>
          <Link href="/login" className={f.link}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
