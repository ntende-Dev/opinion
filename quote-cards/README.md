# Quote cards

Remotion compositions that turn a story into a shareable pull-quote card —
rendered **on your own machine** and (optionally) uploaded to the same Object
Storage bucket the site's images already live in.

Nothing here runs on Vercel, on a schedule, or on anyone else's servers. It is
a local tool an editor runs when a story is worth a card.

## What it makes

| Composition       | Size      | Use                                  |
| ----------------- | --------- | ------------------------------------ |
| `QuoteCard`       | 1080×1920 | Reels, Stories, TikTok (9:16)        |
| `QuoteCardSquare` | 1080×1080 | X / LinkedIn / Instagram feed (1:1)  |

Nine seconds at 30fps, H.264 MP4, silent. The masthead fades in, a rule draws,
the quote rises into place, the byline and footer follow, then the card eases
out to paper so the file loops cleanly.

The look follows `DESIGN.md`: Literta for the quote and the byline, Outfit only
for the small chrome, paper white, ink `#111827`, accent `#7F1D1D` used for the
quote marks, the attribution rule and one square. No captions, no gradients,
no boxed labels.

## Setup

```bash
cd quote-cards
npm install
```

The first render downloads Chrome Headless Shell (~120 MB) into Remotion's
cache. Fonts (Literata, Outfit) are fetched from Google Fonts and cached by
`@remotion/google-fonts`.

## Preview

```bash
npm run studio            # opens the Studio at localhost with live props
npm run still             # out/quote-card.png     (vertical, frame 200)
npm run still:square      # out/quote-card-square.png
```

## Render a story

```bash
npm run render:story                          # newest published story
npm run render:story -- --story mystory       # by slug, or by numeric id
npm run render:story -- --story mystory --format square
npm run render:story -- --quote "The line you actually want on the card"
npm run render:story:upload                   # render, then upload
```

`--upload` puts the file at `s3://assets/quote-cards/<slug>.<format>.mp4`.
Without `--upload` nothing leaves the machine; the MP4 in `out/` is the deliverable.

Full flag list: `node scripts/render-story.mjs --help`.

The quote is taken from the first paragraph of the story body, trimmed to the
last sentence boundary before 240 characters. Be aware that "first paragraph"
is not always the line you would choose by hand — the sports reports in
particular open with a scoreline. `--quote` exists for exactly that reason, and
the props for every render are written to `out/<slug>.<format>.props.json` so a
card can be reproduced exactly.

## Notes and caveats

- **Reading the database is read-only.** The script only ever runs `SELECT`.
  It uses `DATABASE_URL` from the repository's `.env` via `--env-file`, and the
  same `AWS_*` variables the site's uploader uses for Object Storage.
- **The site cannot serve these videos yet.** `app/api/images/[...key]/route.ts`
  only accepts `stories/<uuid>.<jpg|png|webp|gif|avif>`, so an MP4 under
  `quote-cards/` is unreachable through the app. Widening that route (or adding
  a sibling one) for `.mp4` under a `quote-cards/` prefix is a small, deliberate
  change to app code — not made here.
- **There is no viewable share link.** The storage host answers every
  browser-style GET with its own console page, signed URL or not, so a
  presigned link is useless in a browser. Objects are read back with the S3 API
  — verified: `HeadObject` reports `video/mp4` and the right byte count, and
  `GetObject` returns a real `ftyp`-boxed MP4. Until app code serves video,
  treat the file in `out/` as the artifact and upload it wherever the clip is
  going.
- **Inter-word spaces and per-word animation.** Chromium drops the gap between
  adjacent transformed `inline-block` spans, so the quote is revealed as one
  block rather than word by word. That also suits the editorial voice better:
  a pull-quote typed out one word at a time reads as a gimmick.
- **The quote is set upright, not italic.** While chasing the spacing bug the
  italic faces looked like the culprit; they were not (the spans were), so
  italic is untested rather than broken. Upright Literata at this size is the
  more legible choice anyway.
- **Licensing.** Remotion is free for individuals and for-profit companies of
  up to three people; larger organisations need a company licence. Rendering
  locally is free either way — there is no per-render cost and no cloud
  service involved. Check the current terms at remotion.dev/license before
  putting this in a newsroom workflow.
