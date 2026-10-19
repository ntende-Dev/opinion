"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import d from "./Dashboard.module.scss";

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
      className={`${d.submitReview} font-ui`}
    >
      {busy ? "Sending…" : "Submit for review"}
    </button>
  );
}
