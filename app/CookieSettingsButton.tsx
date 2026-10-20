"use client";
import { OPEN_EVENT } from "@/lib/consent";

/**
 * The footer's "Cookie settings" — the way back into the consent question
 * once it has been answered. It only asks the bar to come back; the bar
 * itself (CookieConsent) listens and reappears. Client-side by necessity:
 * the event must be dispatched from the browser, and the button ships
 * inside the server-rendered footer.
 */
export default function CookieSettingsButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
    >
      Cookie settings
    </button>
  );
}
