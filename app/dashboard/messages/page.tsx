import { db } from "@/drizzle/db";
import { contactMessages } from "@/drizzle/schema";
import { desc, eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EDITORS } from "@/lib/roles";
import { markHandled } from "@/app/contact/action";

export const dynamic = "force-dynamic";

export default async function Messages() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!EDITORS.includes(role)) redirect("/dashboard");

  const [open, handled] = await Promise.all([
    db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.handled, "false"))
      .orderBy(desc(contactMessages.createdAt)),
    db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.handled, "true"))
      .orderBy(asc(contactMessages.createdAt)),
  ]);

  function row(m: typeof contactMessages.$inferSelect, isHandled: boolean) {
    return (
      <li
        key={m.id}
        className="border-b border-[var(--color-line)] pb-6 last:border-0"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">{m.subject}</h3>
            <p className="mt-1 text-sm text-muted font-ui">
              {m.name} ·{" "}
              <a href={`mailto:${m.email}`} className="hover:underline">
                {m.email}
              </a>
            </p>
            <p className="mt-1 text-xs text-muted font-ui">
              {m.createdAt && new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
          {isHandled ? (
            <span className="shrink-0 rounded-full bg-gray-200 px-2.5 py-0.5 font-sans text-xs font-medium uppercase tracking-wider text-gray-700">
              handled
            </span>
          ) : (
            <form action={markHandled} className="shrink-0">
              <input type="hidden" name="id" value={m.id} />
              <button className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-ui font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors">
                Mark handled
              </button>
            </form>
          )}
        </div>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed">{m.message}</p>
      </li>
    );
  }

  return (
    <div className="font-body">
      <h1 className="font-display mb-6">Messages</h1>
      <section>
        <h2 className="font-display mb-3 text-lg">Open ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-muted measure mb-10">
            No new messages. The mailbag is empty.
          </p>
        ) : (
          <ul className="measure space-y-6 mb-10">
            {open.map((m) => row(m, false))}
          </ul>
        )}
      </section>
      {handled.length > 0 && (
        <section>
          <h2 className="font-display mb-3 text-lg">Handled ({handled.length})</h2>
          <ul className="measure space-y-6 opacity-75">
            {handled.map((m) => row(m, true))}
          </ul>
        </section>
      )}
    </div>
  );
}
