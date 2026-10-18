import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { stories } from "@/drizzle/schema";
import { eq, count } from "drizzle-orm";
import { EDITORS } from "@/lib/roles";
import SessionGuard from "./SessionGuard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const isEditor = EDITORS.includes((session.user as any).role);

  const [{ n: pendingCount }] = await db
    .select({ n: count() })
    .from(stories)
    .where(eq(stories.status, "pending"));

  return (
    <div className="container font-body">
      <SessionGuard />
      <nav className="mb-10 flex items-center gap-4 border-b border-[var(--color-line)] pb-4 text-sm font-ui">
        <Link href="/dashboard" className="hover:underline">
          My stories
        </Link>
        <Link href="/dashboard/write" className="hover:underline">
          Write
        </Link>
        {isEditor && (
          <Link
            href="/dashboard/messages"
            className="hover:underline"
          >
            Messages
          </Link>
        )}
        {isEditor && (
          <Link
            href="/dashboard/review"
            className="font-semibold text-[var(--color-accent)] hover:underline"
          >
            Review queue
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-accent)] text-white">
                ({pendingCount})
              </span>
            )}
          </Link>
        )}
      </nav>
      <main>{children}</main>
    </div>
  );
}
