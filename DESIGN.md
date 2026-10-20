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
| display red | #ED1C24 | brighter envelope red, display only — the desk masthead's word and Inside pill (dark mode lightens it to #F4585F); never for links or controls |
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
1. Typography is the hero - no illustration/gradient decoration required.
2. Restraint: one memorable element (the serif editorial voice); everything around it quiet and disciplined.
3. Structural devices (rules, badges, dividers) encode information, never pure decoration.
4. Accessibility floor: responsive, visible keyboard focus, reduced motion respected, harmonious palette.

## Section masthead (the desk cover)
- Each desk page opens on a cover, not a heading: "The Opinion Weekly" in Outfit 600, then the desk word in Literata 900 uppercase filling 97% of the column width in the house red, then an "Inside →" ticker strip.
- **The culture desk (entertainment) carries its own cover**: the word's letters sit on individual colour plates — Outfit 400 caps in print ink on a thirteen-colour palette (one plate per letter of the word, no repeats: blush, cornflower, butter, olive, apricot, lavender, chartreuse, sky, taupe, orange, seafoam, greige, mint, the standing seven 20% lighter toward white) — running the full column edge to edge, under the note strip: "Arts & Entertainment" in bold Literata, a rule, and the Monday–Sunday publication week in Outfit. Configured by `Desk.brand` in `lib/sections.ts`; its h1 carries `aria-label` and the plates are `aria-hidden`.
- The word's exact fit is two-layered: the server emits a container-query size from a small uppercase-advance table (calibrated +3%), and `FitWord` (client) measures the real glyphs after fonts load and lands the line on 97% of the column (the tile band fills 100%). No script, within a few percent.
- The word and the Inside pill run on `--color-display-red` (#ED1C24) — the bright envelope red of the desk-branding reference. Structural and functional reds stay on `--color-accent`; the culture plates keep their palette regardless of theme, with letters holding print ink in both.
- The ticker is a CSS marquee: the desk's published headlines uppercase Outfit 700, each a link, separated by `|`, duplicated once and translating `-50%` so the loop's seam is a duplicate arriving. Edges fade via mask; hover pauses; `prefers-reduced-motion` turns the strip into a plain scrolling row. The repeated copy is `aria-hidden`.
- This is the deliberate all-caps exception in the design system — a display lockup, not a label. Everything else keeps sentence case.

## Story furniture (the article page, bottom to top)
- **Desk kicker**: a short 2px accent rule, then the desk name in Outfit `--step--1` (normal case, linked) above the headline.
- **Byline**: the writer in ink (weight 500), the date behind an em dash in muted; no writer, no dash.
- **Pull quote** (`blockquote` in `.prose-content`): hairlines above and below, display type centred at `--step-2`, the house red opens it with a large raised quotation mark, `cite` in Outfit muted. No side rules, no italic.
- **Figures** (`figure`/`figcaption`/inline `img` in `.prose-content`): hairline frame and 0.25rem radius like the cover; captions in Outfit `--step--1` muted, held off the plate.
- **Related stories**: after the endnote, display-type heading ("More from *Desk*", falling back to "Elsewhere in the paper" when the desk is empty) over the ordinary 2-up card grid.
- **Print**: everything carrying `data-print="hide"` (masthead, footer, consent bar, progress rule, ad strip, back-to-top), plus `footer`/`.skip-link`/toasts, stays on screen; measure opens, type steps to 11pt, external links print their address, figures and quotes never break across a page.

## Motion (two systems, one vocabulary)
- The vocabulary is `styles/_motion.scss` mixins (paper-rise / drop / lean / leave) + the duration/easing tokens in `globals.scss`. CSS Modules hash keyframes, so a module that names an animation also emits it. No GSAP, no smooth-scroll library.
- **Compressing masthead**: `SiteHeader`'s two tiers sit in a sticky `.stick` bar (paper-painted, z-80). Past 140px it compresses (tighter paddings, 64px-to-40px mark, softer avatar, one hairline + soft shadow); back above 40px it releases. Hysteresis so boundary readers never see it thrash; one rAF-coalesced listener. The ad and mobile panel anchor to the document or the bar as belonging to each.
- **Latest-grid reveal**: cards are visible by default; `RevealGrid` (client) applies a pending state and an IntersectionObserver per card, so each row lifts 14px and settles as it crosses the fold, the right-hand card 90ms after the left. Anchors land with 7.5rem scroll-margin so the bar never covers what a link pointed at.

## Review against defaults
- Not warm cream + terracotta ✓ (white + deep ink + editorial red)
- Not acid-green dark mode ✓ (no dark mode palette introduced)
- Not broadsheet hairline-rule newspaper ✓ (single centered column, serif magazine voice)
- Not SaaS-card kit ✓ (no identical rounded cards, no soft grey shadows)
- Not ALL-CAPS eyebrows / middle-dot meta ✓ (explicitly excluded)

The plan is distinct from the generic default, so implementation proceeds.
