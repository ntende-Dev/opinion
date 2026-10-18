"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";

export default function ImageUpload({
  onUploaded,
  label,
}: {
  onUploaded: (url: string) => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    setBusy(true);
    const url = await uploadImage(file);
    setBusy(false);
    if (url) onUploaded(url);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-selecting the same file
          if (file) pick(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded border border-[var(--color-line)] px-3 py-2 text-sm font-ui font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}
