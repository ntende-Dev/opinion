"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Status } from "@/lib/roles";

type Row = {
  id: number;
  title: string;
  slug: string;
  status: Status;
  authorName: string | null;
};

const chip: Record<Status, string> = {
  draft: "bg-gray-200 text-gray-700",
  pending: "bg-amber-200 text-amber-800",
  published: "bg-green-200 text-green-800",
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
    <ul className="space-y-4">
      {rows.map((r) => (
        <li
          key={r.id}
          className="border border-[var(--color-line)] rounded p-3 sm:p-4 flex flex-wrap items-center gap-3"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/story/${r.slug}`}
              className="font-display font-semibold hover:underline decoration-2 underline-offset-4"
            >
              {r.title}
            </Link>
            <p className="mt-1 font-ui text-xs text-[var(--color-muted)]">
              {r.authorName ?? "Unknown author"}
            </p>
          </div>
          <span
            className={`font-sans inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${chip[r.status]}`}
          >
            {r.status}
          </span>
          <div className="flex items-center gap-2 font-ui text-sm">
            <Link
              href={`/dashboard/write?story=${r.id}`}
              className="rounded border border-[var(--color-line)] px-3 py-1.5 no-underline hover:border-[var(--color-muted)] transition-colors"
            >
              Edit
            </Link>
            <button
              type="button"
              disabled={busyId === r.id || removing === r.id}
              onClick={() => toggleStatus(r)}
              className="rounded border border-[var(--color-line)] px-3 py-1.5 hover:bg-[var(--color-line)] transition-colors disabled:opacity-60"
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
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60"
            >
              {removing === r.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </li>
      ))}
      {rows.length === 0 && (
        <li className="text-sm text-[var(--color-muted)]">
          No stories in the system yet.
        </li>
      )}
    </ul>
  );
}
