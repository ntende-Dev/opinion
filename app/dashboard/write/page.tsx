"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PulseLoader from "react-spinners/PulseLoader";
import ImageUpload from "./ImageUpload";
import Feedback from "@/app/Feedback";
import { uploadImage } from "@/lib/upload";
import { toast } from "sonner";

export default function Write() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        excerpt: String(formData.get("excerpt") ?? ""),
        content: String(formData.get("content") ?? ""),
        coverImage: coverImage || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error || "Could not create story");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  /** Upload an image and drop an <img> tag at the caret in the content box. */
  async function insertImage() {
    const el = contentRef.current;
    if (!el) return;
    setUploading(true);
    try {
      const url = await new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null); // dialog cancelled without a file
            return;
          }
          uploadImage(file)
            .then(resolve)
            .catch((e) => {
              toast.error(e instanceof Error ? e.message : "Image upload failed");
              resolve(null);
            });
        };
        document.body.appendChild(input);
        input.style.display = "none";
        input.click();
        input.oncancel = () => {
          input.remove();
          resolve(null);
        };
      });
      if (!url) return;
      const img = `<p><img src="${url}" alt="" style="max-width:100%" /></p>`;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, start) + "\n" + img + "\n" + el.value.slice(end);
      toast.success("Image inserted.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="font-body measure">
      {/* Upload-in-progress veil: quiet, centered spinner over the form */}
      {uploading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70">
          <div className="flex flex-col items-center gap-3">
            <PulseLoader size={12} color="var(--color-accent)" />
            <p className="font-ui text-sm text-[var(--color-muted)]" aria-live="polite">
              Uploading image…
            </p>
          </div>
        </div>
      )}
      <h1 className="font-display mb-6">Write a story</h1>
      {error && <Feedback>{error}</Feedback>}
      <form action={submit} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="slug"
            className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
          >
            Slug (e.g. my-story)
          </label>
          <input
            id="slug"
            name="slug"
            required
            className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body font-ui focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="excerpt"
            className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
          >
            Excerpt
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="content"
            className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
          >
            Content (HTML)
          </label>
          <textarea
            id="content"
            name="content"
            ref={contentRef}
            rows={10}
            className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={insertImage}
              className="rounded border border-[var(--color-line)] px-3 py-2 text-sm font-ui font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Insert image at cursor"}
            </button>
          </div>
        </div>
        <div>
          <span className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]">
            Cover image
          </span>
          {coverImage && (
            <img
              src={coverImage}
              alt="Cover preview"
              className="mb-2 max-h-48 w-auto rounded border border-[var(--color-line)]"
            />
          )}
          <div className="flex items-center gap-2">
            <ImageUpload label="Upload cover image" onUploaded={setCoverImage} />
            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage("")}
                className="text-sm font-ui text-[var(--color-accent)] hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <button
          disabled={busy}
          className="rounded bg-[var(--color-accent)] px-4 py-2 text-white font-ui font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400"
        >
          {busy ? "Saving…" : "Save as draft"}
        </button>
      </form>
      <p className="mt-8 text-sm font-ui">
        <Link href="/dashboard" className="underline underline-offset-2 hover:no-underline">
          ← Back to my stories
        </Link>
      </p>
    </div>
  );
}
