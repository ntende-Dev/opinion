import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq, count } from "drizzle-orm";
import { EDITORS } from "@/lib/roles";
import SessionGuard from "./SessionGuard";
import d from "./Dashboard.module.scss";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const isEditor = EDITORS.includes((session.user as any).role);
  const isAdmin = (session.user as any).role === "admin";

  const [{ n: pendingCount }] = await db
    .select({ n: count() })
    .from(stories)
    .where(eq(stories.status, "pending"));

  return (
    <div className="container font-body">
      <SessionGuard />
      <nav className={`${d.nav} font-ui`}>
        <Link href="/dashboard">
          My stories
        </Link>
        <Link href="/dashboard/write">
          Write
        </Link>
        {isEditor && (
          <Link
            href="/dashboard/messages"
          >
            Messages
          </Link>
        )}
        {isEditor && (
          <Link
            href="/dashboard/review"
            className={d.reviewLink}
          >
            Review queue
            {pendingCount > 0 && (
              <span className={d.reviewCount}>
                ({pendingCount})
              </span>
            )}
          </Link>
        )}
        {isAdmin && (
          <Link href="/dashboard/admin">
            Users
          </Link>
        )}
      </nav>
      <main>{children}</main>
    </div>
  );
}
