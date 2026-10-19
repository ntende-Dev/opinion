"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PulseLoader from "react-spinners/PulseLoader";
import ImageUpload from "./ImageUpload";
import Feedback from "@/app/Feedback";
import { uploadImage } from "@/lib/upload";
import { toast } from "sonner";
import w from "./Write.module.scss";
import f from "@/app/Form.module.scss";

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
        <div className={w.veil}>
          <div className={w.veilInner}>
            <PulseLoader size={12} color="var(--color-accent)" />
            <p className={`${w.veilText} font-ui`} aria-live="polite">
              Uploading image…
            </p>
          </div>
        </div>
      )}
      <h1 className={`${w.title} font-display`}>
        {storyId ? "Edit story" : "Write a story"}
      </h1>
      {loadError && <Feedback>{loadError}</Feedback>}
      {error && <Feedback>{error}</Feedback>}
      {/* key remount applies the loaded story to the uncontrolled fields */}
      <form key={editStory?.id ?? 0} action={submit} className={w.form}>
        <div>
          <label
            htmlFor="title"
            className={`${f.label} font-ui`}
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={editStory?.title ?? ""}
            className={f.input}
          />
        </div>
        <div>
          <label
            htmlFor="slug"
            className={`${f.label} font-ui`}
          >
            Slug (e.g. my-story)
            {storyId ? (
              <span className={w.labelNote}>
                — changing it moves the story&apos;s URL
              </span>
            ) : (
              <span className={w.labelNote}>
                — tidied to lowercase-with-dashes automatically
              </span>
            )}
          </label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={editStory?.slug ?? ""}
            className={`${f.input} font-ui`}
          />
        </div>
        <div>
          <label
            htmlFor="excerpt"
            className={`${f.label} font-ui`}
          >
            Excerpt
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            defaultValue={editStory?.excerpt ?? ""}
            className={f.input}
          />
        </div>
        <div>
          <label
            htmlFor="content"
            className={`${f.label} font-ui`}
          >
            Content (HTML)
          </label>
          <textarea
            id="content"
            name="content"
            ref={contentRef}
            rows={12}
            defaultValue={editStory?.content ?? ""}
            className={f.input}
          />
          <div className={w.insertRow}>
            <button
              type="button"
              disabled={busy}
              onClick={insertImage}
              className={`${w.insertButton} font-ui`}
            >
              {busy ? "Uploading…" : "Insert image at cursor"}
            </button>
          </div>
        </div>
        <div>
          <span className={`${f.label} font-ui`}>
            Cover image
          </span>
          {coverImage && (
            <img
              src={coverImage}
              alt="Cover preview"
              className={w.coverPreview}
            />
          )}
          <div className={w.coverRow}>
            <ImageUpload label="Upload cover image" onUploaded={setCoverImage} />
            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage("")}
                className={`${w.removeCover} font-ui`}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <button
          disabled={busy}
          className={`${f.submit} font-ui`}
        >
          {busy ? "Saving…" : storyId ? "Save changes" : "Save as draft"}
        </button>
      </form>
      <p className={`${w.backNote} font-ui`}>
        <Link
          href={fromPage === "home" ? "/" : "/dashboard"}
          className={f.link}
        >
          {fromPage === "home" ? "← Back to the front page" : "← Back to my stories"}
        </Link>
      </p>
    </div>
  );
}
