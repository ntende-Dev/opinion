"use client";
import { useState } from "react";
import Link from "next/link";
import { send } from "./action";
import Feedback from "@/app/Feedback";
import { toast } from "sonner";
import f from "@/app/Form.module.scss";

export default function Contact() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    const result = await send(formData);
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSent(true);
    toast.success("Message sent — it's in the editors' inbox.");
  }

  return (
    <div className="container font-body">
      <div className="measure">
        <h1 className={`${f.title} font-display`}>Write to the editors</h1>
        <p className={`${f.intro} text-lead`}>
          Letters to the editor, corrections, pitches, questions — we read
          everything.
        </p>

        {sent ? (
          <div className={f.sent}>
            <p className={`${f.sentTitle} font-display`}>
              Thank you — your message is in our inbox.
            </p>
            <p className={`${f.sentNote} text-muted font-ui`}>
              We reply to every letter that includes a working email address.
            </p>
            <p className={`${f.note} font-ui`}>
              <Link href="/" className={f.link}>
                ← Back to home
              </Link>
            </p>
          </div>
        ) : (
          <>
            {error && <Feedback>{error}</Feedback>}
            <form action={submit} className={f.form}>
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
                <label htmlFor="subject" className={`${f.label} font-ui`}>
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  className={f.input}
                />
              </div>
              <div>
                <label htmlFor="message" className={`${f.label} font-ui`}>
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  maxLength={5000}
                  className={f.input}
                />
              </div>
              {/* Honeypot: hidden from humans, irresistible to bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className={f.honeypot}
                aria-hidden="true"
              />
              <button disabled={busy} className={`${f.submit} font-ui`}>
                {busy ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
