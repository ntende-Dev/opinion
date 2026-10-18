"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewActions({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(status: "published" | "draft", reviewNote?: string) {
    setBusy(true);
    const res = await fetch(`/api/stories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2 font-ui">
      <button
        disabled={busy}
        onClick={() => move("published")}
        className="rounded bg-green-600 px-3 py-1.5 text-sm text-white font-medium disabled:opacity-50 hover:bg-green-700 transition-colors"
      >
        Publish
      </button>
      <button
        disabled={busy}
        onClick={() => {
          const note = window.prompt(
            "Feedback for the contributor (optional)",
          );
          if (note !== null) move("draft", note);
        }}
        className="rounded bg-red-600 px-3 py-1.5 text-sm text-white font-medium disabled:opacity-50 hover:bg-red-700 transition-colors"
      >
        Reject
      </button>
    </div>
  );
}
