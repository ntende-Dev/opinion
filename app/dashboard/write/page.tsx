"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PulseLoader from "react-spinners/PulseLoader";
import ImageUpload from "./ImageUpload";
import Feedback from "@/app/Feedback";
import { uploadImage } from "@/lib/upload";
import { toast } from "sonner";

type EditStory = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
};

export default function Write() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editStory, setEditStory] = useState<EditStory | null>(null);
  const [loadError, setLoadError] = useState("");
  // "home" when opened from a story card's Edit action, else the dashboard.
  const [fromPage, setFromPage] = useState<string>("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const storyId = editStory?.id ?? null;

  useEffect(() => {
    // URL params without useSearchParams — dashboard pages render statically.
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("story");
    setFromPage(params.get("from") ?? "");
    if (!raw || !/^\d+$/.test(raw)) return;
    fetch(`/api/stories/${raw}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((s: EditStory) => {
        setEditStory(s);
        setCoverImage(s.coverImage ?? "");
      })
      .catch((code) => {
        setLoadError(
          code === 403
            ? "You don't have permission to edit that story."
            : code === 404
              ? "Story not found."
              : "Could not load the story.",
        );
      });
  }, []);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      excerpt: String(formData.get("excerpt") ?? ""),
      content: String(formData.get("content") ?? ""),
      // Empty means remove the cover — PUT fully specifies the row.
      coverImage: coverImage || null,
    };
    const res = await fetch(
      storyId ? `/api/stories/${storyId}` : "/api/stories",
      {
        method: storyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error || (storyId ? "Could not save changes" : "Could not create story"));
      return;
    }
    toast.success(storyId ? "Story updated." : "Story saved as draft.");
    router.push(fromPage === "home" ? "/" : "/dashboard");
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
      <h1 className="font-display mb-6">
        {storyId ? "Edit story" : "Write a story"}
      </h1>
      {loadError && <Feedback>{loadError}</Feedback>}
      {error && <Feedback>{error}</Feedback>}
      {/* key remount applies the loaded story to the uncontrolled fields */}
      <form key={editStory?.id ?? 0} action={submit} className="space-y-6">
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
            defaultValue={editStory?.title ?? ""}
            className="block w-full border border-[var(--color-line)] rounded px-3 py-2 text-base font-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="slug"
            className="block mb-1 text-sm font-ui font-medium text-[var(--color-muted)]"
          >
            Slug (e.g. my-story)
            {storyId && (
              <span className="ml-2 font-normal text-[var(--color-muted)] normal-case">
                — changing it moves the story&apos;s URL
              </span>
            )}
          </label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={editStory?.slug ?? ""}
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
            defaultValue={editStory?.excerpt ?? ""}
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
            rows={12}
            defaultValue={editStory?.content ?? ""}
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
          {busy ? "Saving…" : storyId ? "Save changes" : "Save as draft"}
        </button>
      </form>
      <p className="mt-8 text-sm font-ui">
        <Link
          href={fromPage === "home" ? "/" : "/dashboard"}
          className="underline underline-offset-2 hover:no-underline"
        >
          {fromPage === "home" ? "← Back to the front page" : "← Back to my stories"}
        </Link>
      </p>
    </div>
  );
}
