"use client";
import { useState } from "react";
import Link from "next/link";
import { send } from "./action";
import Feedback from "@/app/Feedback";
import { toast } from "sonner";

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
        <h1 className="font-display mb-2">Write to the editors</h1>
        <p className="mt-2 text-lead">
          Letters to the editor, corrections, pitches, questions — we read
          everything.
        </p>

        {sent ? (
          <div className="mt-8">
            <p className="font-display text-xl">
              Thank you — your message is in our inbox.
            </p>
            <p className="mt-3 text-muted font-ui text-sm">
              We reply to every letter that includes a working email address.
            </p>
            <p className="mt-6 text-sm font-ui">
              <Link href="/" className="underline underline-offset-2 hover:no-underline">
                ← Back to home
              </Link>
            </p>
          </div>
        ) : (
          <>
            {error && <Feedback>{error}</Feedback>}
            <form action={submit} className="mt-6 space-y-4">
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
                  htmlFor="subject"
                  className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  maxLength={5000}
                  className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              {/* Honeypot: hidden from humans, irresistible to bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              <button
                disabled={busy}
                className="rounded bg-[var(--color-accent)] px-4 py-2 text-white font-ui font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400"
              >
                {busy ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
