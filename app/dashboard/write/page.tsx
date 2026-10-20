"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PulseLoader from "react-spinners/PulseLoader";
import ImageUpload from "./ImageUpload";
import Feedback from "@/app/Feedback";
import { SECTIONS } from "@/lib/sections";
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
  coverFocalX: number;
  coverFocalY: number;
  section: string | null;
};

export default function Write() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState("");
  // The point the hero and cards keep when they crop the cover. 50/50 is the
  // centre of the picture, which is also what every existing story uses.
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [editStory, setEditStory] = useState<EditStory | null>(null);
  const [loadError, setLoadError] = useState("");
  // "home" when opened from a story card's Edit action, else the dashboard.
  const [fromPage, setFromPage] = useState<string>("");
  // A story is minutes of typing; this guards the reload/close that would lose it.
  const [dirty, setDirty] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const storyId = editStory?.id ?? null;

  /** Any edit to a field arms the unsaved-work guard. */
  function markDirty() {
    setDirty(true);
  }

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
        setFocalX(s.coverFocalX ?? 50);
        setFocalY(s.coverFocalY ?? 50);
      })
      .catch((code) => {
        setLoadError(
          code === 403
            ? "You don’t have permission to edit that story."
            : code === 404
              ? "Story not found."
              : "Could not load the story.",
        );
      });
  }, []);

  /** Warn before a reload or tab close throws away unsaved writing. */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /** A failed save or a failed load puts the reader on the message. */
  useEffect(() => {
    if (error || loadError) errorRef.current?.focus();
  }, [error, loadError]);

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
      coverFocalX: focalX,
      coverFocalY: focalY,
      section: String(formData.get("section") ?? ""),
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
    setDirty(false);
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
          // The picker node is removed as soon as it has done its job, so
          // repeated inserts do not litter the body with hidden inputs.
          input.remove();
          if (!file) {
            resolve(null); // dialog closed without choosing a file
            return;
          }
          uploadImage(file)
            .then(resolve)
            .catch((e) => {
              toast.error(e instanceof Error ? e.message : "Image upload failed");
              resolve(null);
            });
        };
        input.oncancel = () => {
          input.remove();
          resolve(null);
        };
        document.body.appendChild(input);
        input.style.display = "none";
        input.click();
      });
      if (!url) return;
      const img = `<p><img src="${url}" alt="" style="max-width:100%" /></p>`;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, start) + "\n" + img + "\n" + el.value.slice(end);
      markDirty();
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
      {loadError || error ? (
        <div ref={errorRef} tabIndex={-1}>
          <Feedback>{loadError || error}</Feedback>
        </div>
      ) : null}
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
            autoComplete="off"
            defaultValue={editStory?.title ?? ""}
            onChange={markDirty}
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
            autoComplete="off"
            spellCheck={false}
            defaultValue={editStory?.slug ?? ""}
            onChange={markDirty}
            className={`${f.input} font-ui`}
          />
        </div>
        <div>
          <label
            htmlFor="section"
            className={`${f.label} font-ui`}
          >
            Section
            <span className={w.labelNote}>
              — the desk the story files under, printed in the masthead
            </span>
          </label>
          <select
            id="section"
            name="section"
            defaultValue={editStory?.section ?? ""}
            onChange={markDirty}
            className={`${f.input} font-ui`}
          >
            <option value="">Unfiled</option>
            {SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
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
            autoComplete="off"
            defaultValue={editStory?.excerpt ?? ""}
            onChange={markDirty}
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
            autoComplete="off"
            defaultValue={editStory?.content ?? ""}
            onChange={markDirty}
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
            <>
              <div className={w.coverPreviews}>
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className={w.coverPreview}
                />
                <figure className={w.cropPreview}>
                  <img
                    src={coverImage}
                    alt=""
                    className={w.cropImage}
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                  <figcaption className={`${w.cropCaption} font-ui`}>
                    Desktop hero
                  </figcaption>
                </figure>
                <figure className={w.cropPreviewWide}>
                  <img
                    src={coverImage}
                    alt=""
                    className={w.cropImageWide}
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                  <figcaption className={`${w.cropCaption} font-ui`}>
                    Phone hero
                  </figcaption>
                </figure>
              </div>
              <div
                className={w.focal}
                role="group"
                aria-labelledby="cover-crop-label"
              >
                <p
                  id="cover-crop-label"
                  className={`${w.focalLegend} font-ui`}
                >
                  Cover crop
                </p>
                <p className={w.focalHint}>
                  Move the crop until the subject stays inside the hero and
                  card frames.
                </p>
                <div className={w.focalRow}>
                  <label htmlFor="focal-x" className={w.focalLabel}>
                    Horizontal
                  </label>
                  <input
                    id="focal-x"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={focalX}
                    onChange={(event) => {
                      setFocalX(Number(event.target.value));
                      markDirty();
                    }}
                    className={w.focalRange}
                  />
                  <output htmlFor="focal-x" className={w.focalValue}>
                    {focalX}%
                  </output>
                </div>
                <div className={w.focalRow}>
                  <label htmlFor="focal-y" className={w.focalLabel}>
                    Vertical
                  </label>
                  <input
                    id="focal-y"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={focalY}
                    onChange={(event) => {
                      setFocalY(Number(event.target.value));
                      markDirty();
                    }}
                    className={w.focalRange}
                  />
                  <output htmlFor="focal-y" className={w.focalValue}>
                    {focalY}%
                  </output>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFocalX(50);
                    setFocalY(50);
                    markDirty();
                  }}
                  className={`${w.focalReset} font-ui`}
                >
                  Centre the crop
                </button>
              </div>
            </>
          )}
          <div className={w.coverRow}>
            <ImageUpload
              label="Upload cover image"
              onUploaded={(url) => {
                setCoverImage(url);
                // A new picture needs its own crop; start from the centre.
                setFocalX(50);
                setFocalY(50);
                markDirty();
              }}
            />
            {coverImage && (
              <button
                type="button"
                onClick={() => {
                  setCoverImage("");
                  setFocalX(50);
                  setFocalY(50);
                  markDirty();
                }}
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
