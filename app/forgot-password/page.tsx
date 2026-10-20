import { ForgotForm } from "./ForgotForm";

export const metadata = {
  title: "Forgot password",
  // The token-bearing reset page must not be indexed either; this page asks
  // for an email address, which is also not search-engine material.
  robots: { index: false, follow: true },
};

export default function ForgotPassword() {
  return <ForgotForm />;
}
