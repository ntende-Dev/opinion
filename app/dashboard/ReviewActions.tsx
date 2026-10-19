"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import r from "./review/Review.module.scss";

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
    <div className={`${r.actions} font-ui`}>
      <button
        disabled={busy}
        onClick={() => move("published")}
        className={r.publish}
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
        className={r.reject}
      >
        Reject
      </button>
    </div>
  );
}
