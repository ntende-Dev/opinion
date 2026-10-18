"use client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  }
  return (
    <button
      onClick={logout}
      className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
    >
      Sign out
    </button>
  );
}
