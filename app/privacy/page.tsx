import type { Metadata } from "next";
import Link from "next/link";
import e from "@/app/Editorial.module.scss";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What The Opinion Weekly collects, why, and how to have it removed — in plain language.",
};

export default function Privacy() {
  return (
    <div className="container font-body">
      <article className="measure">
        <p className={`${e.eyebrow} font-ui`}>
          Information
        </p>
        <h1 className={`${e.title} font-display`}>Privacy</h1>
        <p className={`${e.standfirst} font-ui`}>
          Plain language, not legal boilerplate. Here is everything we hold on
          you, and why.
        </p>

        <div className={`${e.body} prose-content`}>
          <h2>What we collect</h2>

          <p>
            <strong>Your account.</strong> When you sign up we store your name,
            your email address and a securely hashed version of your password.
            We use the email address to verify your account and to reach you
            about your writing. We never store your password in a form anyone
            can read.
          </p>

          <p>
            <strong>What you publish.</strong> Stories you file, cover images
            you upload and the profile details you choose to add are stored so
            the paper can show them. That is the point of them.
          </p>

          <p>
            <strong>Messages you send us.</strong> If you write to the editors
            through the contact form, we keep the message and the email address
            you gave us so we can reply.
          </p>

          <h2>Cookies</h2>

          <p>
            We set one kind of cookie: the session cookie that keeps you signed
            in. We do not run advertising trackers, we do not sell data, and we
            do not follow you around the wider web.
          </p>

          <h2>Who sees it</h2>

          <p>
            Editors can see the stories submitted to the paper, as they must to
            do their work. Beyond that, your details are not shared with anyone.
            We do not sell or rent personal information — not to advertisers,
            not to anyone.
          </p>

          <h2>Deleting your data</h2>

          <p>
            You can change your details at any time from your dashboard. If you
            want your account and its content removed, write to us through the{" "}
            <Link href="/contact">contact page</Link> and we will delete them.
          </p>

          <h2>Questions</h2>

          <p>
            Anything unclear, or anything you would like changed, can be raised
            with the editors on the <Link href="/contact">contact page</Link>.
          </p>
        </div>
      </article>
    </div>
  );
}
