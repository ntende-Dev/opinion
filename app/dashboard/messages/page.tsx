import { db } from "@/drizzle/db";
import { contactMessages } from "@/drizzle/schema";
import { desc, eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EDITORS } from "@/lib/roles";
import { markHandled } from "@/app/contact/action";
import DeleteMessage from "./DeleteMessage";
import ms from "./Messages.module.scss";
import c from "../Chip.module.scss";

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

  const isAdmin = role === "admin";

  function row(m: typeof contactMessages.$inferSelect, isHandled: boolean) {
    return (
      <li key={m.id} className={ms.item}>
        <div className={ms.head}>
          <div>
            <h3 className={`${ms.subject} font-display`}>{m.subject}</h3>
            <p className={`${ms.from} text-muted font-ui`}>
              {m.name} ·{" "}
              <a href={`mailto:${m.email}`}>
                {m.email}
              </a>
            </p>
            <p className={`${ms.date} text-muted font-ui`}>
              {m.createdAt && new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
          <div className={ms.actions}>
            {isHandled ? (
              <span className={`${c.chip} ${c.draft} ${ms.handledChip}`}>
                handled
              </span>
            ) : (
              <form action={markHandled} className={ms.markForm}>
                <input type="hidden" name="id" value={m.id} />
                <button className={`${ms.markButton} font-ui`}>
                  Mark handled
                </button>
              </form>
            )}
            {isAdmin && (
              <DeleteMessage id={m.id} subject={m.subject} />
            )}
          </div>
        </div>
        <p className={ms.body}>{m.message}</p>
      </li>
    );
  }

  return (
    <div className="font-body">
      <h1 className={`${ms.title} font-display`}>Messages</h1>
      <section>
        <h2 className={`${ms.sectionTitle} font-display`}>
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className={`${ms.empty} text-muted measure`}>
            No new messages. The mailbag is empty.
          </p>
        ) : (
          <ul className={`${ms.list} ${ms.openList} measure`}>
            {open.map((m) => row(m, false))}
          </ul>
        )}
      </section>
      {handled.length > 0 && (
        <section>
          <h2 className={`${ms.sectionTitle} font-display`}>
            Handled ({handled.length})
          </h2>
          <ul className={`${ms.list} ${ms.handledList} measure`}>
            {handled.map((m) => row(m, true))}
          </ul>
        </section>
      )}
    </div>
  );
}
