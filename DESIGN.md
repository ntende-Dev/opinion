# The Opinion Weekly — Design Plan

## Brief
Editorial / opinion publishing platform ("Where Every Opinion Matters").
- Audience: readers of opinion & commentary pieces.
- Primary job: publish editorials/stories and let editors approve them through a pending → published workflow.
- Distinctive voice: confident, editorial, magazine-style — not a templated Next.js default.

## Color palette (named hex values)
Avoids the warm-cream + terracotta Claude default and the acid-green dark-mode default.

| Token | Hex | Role |
|-------|-----|------|
| paper | #FFFFFF | page background (newsprint white) |
| ink   | #111827 | primary body/headline text (near-black, not #000) |
| accent| #7F1D1D | editorial deep-red for links, buttons, active states |
| muted | #475569 | secondary text (byline, dates, status badges) |
| line  | #CBD5E1 | subtle rules and dividers |

## Type
Avoids the Geist default (the most common Next.js tell).
- Headlines + body: **Literata** (serif) — one editorial family throughout, weight- and size-driven hierarchy. Serif body suits long-form opinion and gives the site a magazine voice.
- UI chrome (nav, buttons, badges): **Outfit** (sans) — clearly distinct from the serif, used sparingly for functional chrome only.

No ALL-CAPS labels, no tracked-out eyebrow labels, no middle-dot meta strings ("A · B · C"), no "→" appended to every link.

## Layout
- Centered single column; body measure capped at ~62ch (under the 80-char guidance).
- Left-aligned / ragged-right body text (not justified — justified reads as a newspaper cliché).
- Homepage: editorial hero — a large serif headline with a short deck, no gradient-accent big-number default.
- Story pages: generous measure, serif body, drop-cap or pull-quote treatment on opening paragraph.
- Dashboard: quiet editorial admin UI; status badges and buttons carry the accent color only.

## Principles (what makes this unique)
1. Typography is the hero — no illustration/gradient decoration required.
2. Restraint: one memorable element (the serif editorial voice); everything around it quiet and disciplined.
3. Structural devices (rules, badges, dividers) encode information, never pure decoration.
4. Accessibility floor: responsive, visible keyboard focus, reduced motion respected, harmonious palette.

## Review against defaults
- Not warm cream + terracotta ✓ (white + deep ink + editorial red)
- Not acid-green dark mode ✓ (no dark mode palette introduced)
- Not broadsheet hairline-rule newspaper ✓ (single centered column, serif magazine voice)
- Not SaaS-card kit ✓ (no identical rounded cards, no soft grey shadows)
- Not ALL-CAPS eyebrows / middle-dot meta ✓ (explicitly excluded)

The plan is distinct from the generic default, so implementation proceeds.
