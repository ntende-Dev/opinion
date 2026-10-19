"use client";

import { useRef, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { uploadImage } from "@/lib/upload";
import { toast } from "sonner";
import w from "./Write.module.scss";

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
    try {
      const url = await uploadImage(file);
      onUploaded(url);
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setBusy(false);
    }
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
        className={`${w.uploadButton} font-ui`}
        aria-busy={busy}
      >
        {busy && <ClipLoader size={13} color="var(--color-accent)" />}
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}
