// ─────────────────────────────────────────────────────────────────────────
// The reader's cookie choice.
//
// The paper sets one cookie of its own — the session cookie that keeps a
// signed-in contributor signed in — which is strictly necessary and so needs
// no consent. Anything optional (analytics, if it is ever added) must wait
// for a yes, and this module is where that yes is recorded and heard.
//
// The answer lives in localStorage rather than a cookie: consent is a
// preference *about* cookies, not one of them, and it therefore needs no
// consent of its own. If storage is unavailable (private mode, hardened
// browsers), every helper fails soft — the banner simply asks again next
// visit, which is the correct outcome for a choice nobody could record.
// ─────────────────────────────────────────────────────────────────────────

/** "all" allows optional cookies; "essential" keeps only the sign-in cookie. */
export type Consent = "all" | "essential";

/** localStorage slot holding the recorded answer. Versioned for later. */
export const CONSENT_KEY = "opinion.consent.v1";

/** Fired on `window` whenever a visitor records or changes their answer. */
export const CONSENT_EVENT = "opinion:consent";

/** Fired on `window` when "Cookie settings" asks the banner to come back. */
export const OPEN_EVENT = "opinion:consent:open";

/**
 * The consent on record, or null while the question stands unanswered.
 * Safe to call during SSR — there is no answer server-side, by design.
 */
export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw === "all" || raw === "essential" ? raw : null;
  } catch {
    return null;
  }
}

/** Record the answer, and tell anything listening (future analytics). */
export function setConsent(value: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage refused; the banner will ask again next visit.
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

/**
 * Subscribe to consent decisions. Fires at once with whatever is already on
 * record (so a script that arrives after the visitor has answered learns the
 * standing answer immediately), then again on every change. Returns the
 * unsubscribe function.
 */
export function onConsent(callback: (value: Consent) => void): () => void {
  const handler = (event: Event) =>
    callback((event as CustomEvent<Consent>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  const current = getConsent();
  if (current) callback(current);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
