"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitButton({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/stories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending" }),
        });
        setBusy(false);
        if (!res.ok) {
          alert("Could not submit");
          return;
        }
        router.refresh();
      }}
      className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white font-ui font-medium disabled:bg-gray-400 hover:bg-amber-700 transition-colors"
    >
      {busy ? "Sending…" : "Submit for review"}
    </button>
  );
}
