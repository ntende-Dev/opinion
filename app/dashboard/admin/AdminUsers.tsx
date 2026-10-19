"use client";
import { useState } from "react";
import { setRole } from "./actions";
import { toast } from "sonner";
import a from "./Admin.module.scss";
import p from "../Profile.module.scss";

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
    <ul className={a.list}>
      {rows.map((u) => {
        const draft = drafts[u.id] ?? u.role;
        const self = u.id === currentUserId;
        return (
          <li key={u.id} className={a.row}>
            <span
              aria-hidden="true"
              className={`${a.avatar} font-display`}
            >
              {initials(u.name)}
            </span>
            <div className={p.main}>
              <p className={`${p.name} font-display`}>
                {u.name}
                {self && (
                  <span className={`${a.youChip} font-ui`}>
                    you
                  </span>
                )}
              </p>
              <p className={`${p.email} text-muted`}>
                {u.email}
                {!u.verified && (
                  <span className={a.unverified}>
                    unverified
                  </span>
                )}
              </p>
            </div>
            {self ? (
              <span className={`${a.selfRole} font-ui`}>
                {u.role}
              </span>
            ) : (
              <div className={a.controls}>
                <select
                  aria-label={`Role for ${u.name}`}
                  value={draft}
                  disabled={busyId === u.id}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                  }
                  className={`${a.select} font-ui`}
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
                  className={`${a.save} font-ui`}
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
