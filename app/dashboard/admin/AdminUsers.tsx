"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, deleteUser, setRole } from "./actions";
import { toast } from "sonner";
import a from "./Admin.module.scss";
import p from "../Profile.module.scss";
import f from "@/app/Form.module.scss";

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

/** A readable first password: three words' worth of letters plus a digit. */
function suggestPassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  return [...values]
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

export default function AdminUsers({
  initialRows,
  currentUserId,
}: {
  initialRows: Row[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  async function remove(u: Row) {
    if (
      !window.confirm(
        `Delete ${u.name}'s account permanently? This cannot be undone.`,
      )
    )
      return;
    setRemovingId(u.id);
    try {
      await deleteUser(u.id);
      setRows((prev) => prev.filter((r) => r.id !== u.id));
      toast.success("Account deleted.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the account");
    } finally {
      setRemovingId(null);
    }
  }

  async function create(formData: FormData) {
    setCreating(true);
    try {
      const result = await createUser({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "contributor"),
        password: String(formData.get("password") ?? ""),
      });
      setRows((prev) => [...prev, result.user]);
      formRef.current?.reset();
      toast.success(`${result.user.name} can now sign in.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the account");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Hand out accounts directly: the admin picks the first password, so
          the new writer skips the verify-email dance entirely. */}
      <form ref={formRef} action={create} className={a.create}>
        <h2 className={`${a.createTitle} font-display`}>Add a user</h2>
        <div className={a.createGrid}>
          <div>
            <label htmlFor="new-name" className={`${f.label} font-ui`}>
              Name
            </label>
            <input
              id="new-name"
              name="name"
              required
              autoComplete="off"
              className={f.input}
            />
          </div>
          <div>
            <label htmlFor="new-email" className={`${f.label} font-ui`}>
              Email
            </label>
            <input
              id="new-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              spellCheck={false}
              className={f.input}
            />
          </div>
          <div>
            <label htmlFor="new-role" className={`${f.label} font-ui`}>
              Role
            </label>
            <select
              id="new-role"
              name="role"
              defaultValue="contributor"
              className={`${f.input} font-ui`}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-password" className={`${f.label} font-ui`}>
              First password
            </label>
            <div className={a.passwordRow}>
              <input
                id="new-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={f.input}
              />
              <button
                type="button"
                onClick={() => {
                  const field = document.getElementById(
                    "new-password",
                  ) as HTMLInputElement | null;
                  if (field) field.value = suggestPassword();
                }}
                className={`${a.suggest} font-ui`}
              >
                Suggest
              </button>
            </div>
          </div>
        </div>
        <p className={`${a.createNote} font-ui`}>
          The account is created ready to sign in — no verification email.
          Share the password with them yourself; the paper never emails one.
        </p>
        <button disabled={creating} className={`${f.submit} font-ui`}>
          {creating ? "Creating…" : "Create user"}
        </button>
      </form>

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
                  <button
                    type="button"
                    disabled={removingId === u.id}
                    onClick={() => remove(u)}
                    className={`${a.delete} font-ui`}
                  >
                    {removingId === u.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
