"use client";
import { useEffect } from "react";

/**
 * Back/forward-cache guard. When the browser restores a dashboard page from
 * its own memory (bfcache on Back), no server request happens, so a stale
 * signed-in snapshot can appear after sign-out. On restore — or on regaining
 * focus — this verifies the session against the server and hard-navigates to
 * /login if it is gone. The server itself always refuses unauthenticated
 * requests; this only closes the browser-memory loophole.
 */
export default function SessionGuard() {
  useEffect(() => {
    let checking = false;

    function verify() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      fetch("/api/me", { cache: "no-store" })
        .then((r) => {
          if (r.status === 401) window.location.replace("/login");
        })
        .catch(() => {})
        .finally(() => {
          checking = false;
        });
    }

    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) verify();
    }

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", verify);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", verify);
    };
  }, []);

  return null;
}
