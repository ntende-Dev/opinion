import { withAuth } from "next-auth/middleware";

/**
 * Protect the whole dashboard subtree. Runs before render on every
 * /dashboard/* request: missing or invalid session JWT -> redirected to
 * /login (with callbackUrl) automatically. The dashboard layout re-checks
 * the session server-side as the second layer.
 */
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
