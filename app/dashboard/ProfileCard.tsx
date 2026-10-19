"use client";
import { useEffect, useState } from "react";
import ImageUpload from "./write/ImageUpload";
import { toast } from "sonner";
import p from "./Profile.module.scss";

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
    <div className={p.card}>
      {saving ? (
        <span
          aria-hidden="true"
          className={p.avatarPulse}
        />
      ) : profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          className={p.avatarImage}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${p.avatarInitials} font-display`}
        >
          {initials(profile.name)}
        </span>
      )}
      <div className={p.main}>
        <p className={`${p.name} font-display`}>{profile.name}</p>
        <p className={`${p.email} text-muted`}>{profile.email}</p>
        <p className={`${p.roleLine} font-ui`}>
          <span className={p.roleChip}>
            {profile.role}
          </span>
        </p>
      </div>
      <div className={p.actions}>
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
            className={`${p.remove} font-ui`}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
