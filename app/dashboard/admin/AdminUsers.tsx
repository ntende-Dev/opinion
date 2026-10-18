"use client";
import { useState } from "react";
import { setRole } from "./actions";
import { toast } from "sonner";

type Row = {
  id: number;
  name: string;
  email: string;
  role: string;
  verified: boolean;
};

const ROLES = ["contributor", "editor", "admin"] as const;

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function AdminUsers({
  initialRows,
  currentUserId,
}: {
  initialRows: Row[];
  currentUserId: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  async function save(u: Row) {
    const role = drafts[u.id] ?? u.role;
    if (role === u.role) return;
    setBusyId(u.id);
    try {
      await setRole(u.id, role);
      setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, role } : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      toast.success(`${u.name} is now ${role === "admin" ? "an" : "a"} ${role}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the role");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {rows.map((u) => {
        const draft = drafts[u.id] ?? u.role;
        const self = u.id === currentUserId;
        return (
          <li key={u.id} className="py-4 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-display font-bold text-sm"
            >
              {initials(u.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold truncate">
                {u.name}
                {self && (
                  <span className="ml-2 rounded-full border border-[var(--color-line)] px-1.5 py-px font-ui text-[11px] font-normal text-[var(--color-muted)]">
                    you
                  </span>
                )}
              </p>
              <p className="text-sm text-muted truncate">
                {u.email}
                {!u.verified && (
                  <span className="ml-2 text-[var(--color-accent)]">
                    unverified
                  </span>
                )}
              </p>
            </div>
            {self ? (
              <span className="font-ui text-sm text-[var(--color-muted)]">
                {u.role}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Role for ${u.name}`}
                  value={draft}
                  disabled={busyId === u.id}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                  }
                  className="rounded border border-[var(--color-line)] px-2 py-1.5 text-sm font-ui font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-60"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={draft === u.role || busyId === u.id}
                  onClick={() => save(u)}
                  className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-ui font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:bg-gray-400"
                >
                  {busyId === u.id ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
