"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
    >
      Sign out
    </button>
  );
}
