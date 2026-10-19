import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { asc } from "drizzle-orm";
import AdminUsers from "./AdminUsers";
import a from "./Admin.module.scss";

export const dynamic = "force-dynamic";

/** Admin-only. Everyone else is quietly sent back to their own dashboard. */
export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin") redirect("/dashboard");

  const [selfId, list] = await Promise.all([
    Number((session!.user as any).id),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        verified: users.emailVerified,
      })
      .from(users)
      .orderBy(asc(users.id)),
  ]);

  return (
    <div className="font-body measure">
      <h1 className={`${a.title} font-display`}>User management</h1>
      <p className={`${a.intro} text-muted`}>
        Hand contributors the editor role to open the review queue and message
        inbox for them. Roles change instantly; you can never edit your own.
      </p>
      <AdminUsers
        initialRows={list.map((u) => ({
          ...u,
          verified: u.verified !== null && u.verified !== "",
        }))}
        currentUserId={selfId}
      />
    </div>
  );
}
