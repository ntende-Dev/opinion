import Link from "next/link";
import { findUserByResetToken } from "@/lib/reset";
import f from "@/app/Form.module.scss";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set a new password",
  // Token-bearing pages must never be indexed or archived.
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string | string[] }> };

/**
 * The page an emailed link lands on. The token is validated on the server
 * before the form is offered, so an expired link never shows a form that is
 * destined to fail.
 */
export default async function ResetPassword({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = (raw ?? "").trim();

  const user = token ? await findUserByResetToken(token) : null;

  if (!user) {
    return (
      <div className="container font-body">
        <div className="measure-center">
          <h1 className={`${f.title} font-display`}>This link has expired</h1>
          <p className={`${f.subtitle} text-muted font-ui`}>
            Password reset links last 1 hour and can be used once. This one is
            no longer valid — request a fresh one and it will arrive within a
            minute.
          </p>
          <p className={`${f.noteTight} font-ui`}>
            <Link href="/forgot-password" className={f.link}>
              Ask for a new link
            </Link>
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

  return <ResetForm token={token} />;
}
