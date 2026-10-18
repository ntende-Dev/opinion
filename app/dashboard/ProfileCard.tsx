"use client";
import { useEffect, useState } from "react";
import ImageUpload from "./write/ImageUpload";
import { toast } from "sonner";

type Profile = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Own profile block: avatar (persisted in Neon Object Storage via the
 * /api/images proxy), name, role, email. Changing the avatar PATCHes
 * /api/me and re-broadcasts so the header updates in the same beat.
 */
export default function ProfileCard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const r = await fetch("/api/me");
    setProfile(r.ok ? await r.json() : null);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function changeAvatar(url: string) {
    if (!url || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save the avatar");
        return;
      }
      setProfile(data);
      window.dispatchEvent(new Event("profile-updated"));
      toast.success("Avatar saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="mb-10 flex items-center gap-4 border border-[var(--color-line)] rounded-lg p-4">
      {saving ? (
        <span
          aria-hidden="true"
          className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-[var(--color-line)]"
        />
      ) : profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full object-cover border border-[var(--color-line)]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-display font-bold text-xl"
        >
          {initials(profile.name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold truncate">{profile.name}</p>
        <p className="text-sm text-muted truncate">{profile.email}</p>
        <p className="mt-1 font-ui text-xs">
          <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 font-medium text-[var(--color-muted)]">
            {profile.role}
          </span>
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        <ImageUpload label="Change avatar" onUploaded={changeAvatar} />
        {profile.avatarUrl && (
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/me", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ avatarUrl: "" }),
                });
                if (!res.ok) {
                  toast.error("Could not remove the avatar");
                  return;
                }
                setProfile(await res.json());
                window.dispatchEvent(new Event("profile-updated"));
                toast.success("Avatar removed.");
              } finally {
                setSaving(false);
              }
            }}
            className="font-ui text-xs text-[var(--color-muted)] underline underline-offset-2 hover:no-underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
