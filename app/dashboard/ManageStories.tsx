"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Status } from "@/lib/roles";
import d from "./Dashboard.module.scss";
import c from "./Chip.module.scss";

type Row = {
  id: number;
  title: string;
  slug: string;
  status: Status;
  authorName: string | null;
};

const chip: Record<Status, string> = {
  draft: c.draft,
  pending: c.pending,
  published: c.published,
};

/**
 * Admin & editor management for every story in the system — published,
 * pending or draft. Edit opens the shared editor (PUT), the status button
 * publishes a draft or pulls a published story back (PATCH), and Delete
 * removes the row for good (DELETE — confirm first, no undo).
 */
export default function ManageStories({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  async function toggleStatus(r: Row) {
    const next: Status = r.status === "published" ? "draft" : "published";
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/stories/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok)
        throw new Error(
          ((await res.json().catch(() => ({}))) as { error?: string }).error ||
            `Could not ${next === "draft" ? "unpublish" : "publish"}`,
        );
      toast.success(`${r.title} → ${next}.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change status");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: Row) {
    if (!window.confirm(`Delete "${r.title}" permanently? This cannot be undone.`))
      return;
    setRemoving(r.id);
    try {
      const res = await fetch(`/api/stories/${r.id}`, { method: "DELETE" });
      if (!res.ok)
        throw new Error(
          ((await res.json().catch(() => ({}))) as { error?: string }).error ||
            "Could not delete",
        );
      toast.success("Story deleted.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <ul className={d.manageList}>
      {rows.map((r) => (
        <li
          key={r.id}
          className={d.manageRow}
        >
          <div className={d.manageMain}>
            <Link
              href={`/story/${r.slug}`}
              className={`${d.manageTitle} font-display`}
            >
              {r.title}
            </Link>
            <p className={`${d.manageAuthor} font-ui`}>
              {r.authorName ?? "Unknown author"}
            </p>
          </div>
          <span
            className={`${c.chip} ${c.chipFlex} ${chip[r.status]}`}
          >
            {r.status}
          </span>
          <div className={`${d.manageActions} font-ui`}>
            <Link
              href={`/dashboard/write?story=${r.id}`}
              className={d.manageEdit}
            >
              Edit
            </Link>
            <button
              type="button"
              disabled={busyId === r.id || removing === r.id}
              onClick={() => toggleStatus(r)}
              className={d.manageStatus}
            >
              {busyId === r.id
                ? "Working…"
                : r.status === "published"
                  ? "Unpublish"
                  : "Publish"}
            </button>
            <button
              type="button"
              disabled={busyId === r.id || removing === r.id}
              onClick={() => remove(r)}
              className={d.manageDelete}
            >
              {removing === r.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </li>
      ))}
      {rows.length === 0 && (
        <li className={d.manageEmpty}>
          No stories in the system yet.
        </li>
      )}
    </ul>
  );
}
