"use client";
import { useState } from "react";
import { resetPassword } from "./action";
import Feedback from "@/app/Feedback";
import f from "@/app/Form.module.scss";

/**
 * The new-password form behind a valid reset token. A successful action
 * redirects straight to /login?reset=1, so success needs no local state.
 */
export function ResetForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");

    const result = await resetPassword(token, formData);

    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    // The action redirects on success; this branch only runs on an error
    // shape or a suppressed redirect, so clearing the busy flag above is all
    // the recovery needed.
  }

  return (
    <div className="container font-body">
      <div className="measure-center">
        <h1 className={`${f.title} font-display`}>Set a new password</h1>
        <p className={`${f.subtitle} text-muted font-ui`}>
          Choose a new password for your account. At least 8 characters.
        </p>
        {error && <Feedback kind="error">{error}</Feedback>}
        <form action={submit} className={f.form}>
          <div>
            <label htmlFor="password" className={`${f.label} font-ui`}>
              New password
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
          <div>
            <label htmlFor="confirm" className={`${f.label} font-ui`}>
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={f.input}
            />
          </div>
          <button disabled={busy} className={`${f.submit} font-ui`}>
            {busy ? "Updating." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
