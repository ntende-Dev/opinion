import s from "@/app/StoryQuoteCard.module.scss";
import type { QuoteCards } from "@/lib/quoteCards";

type Download = { format: string; label: string; url: string };

/**
 * The finished quote cards for this story, shown under the article once at
 * least one has been rendered. Silent, nine seconds, cut for Instagram, Reels
 * and Stories — see quote-cards/README.md for how they are made and uploaded.
 *
 * The vertical cut plays here. Both cuts are offered as downloads, since the
 * square one is the better fit for a feed post. Rendered only when a card
 * exists in Object Storage, so a story without one carries no empty slot.
 */
export default function StoryQuoteCard({
  title,
  cards,
}: {
  title: string;
  cards: QuoteCards;
}) {
  const playing = cards.vertical ?? cards.square;

  const downloads = [
    { format: "vertical", label: "Download vertical (9:16)", url: cards.vertical },
    { format: "square", label: "Download square (1:1)", url: cards.square },
  ].filter((download): download is Download => download.url !== null);

  return (
    <aside className={s.card}>
      <h2 className={`${s.heading} font-display`}>Share this piece</h2>
      <p className={`${s.note} font-ui`}>
        A nine-second card for Instagram, Reels and Stories.
      </p>

      {playing !== null && (
        <video
          className={s.video}
          src={playing}
          controls
          playsInline
          preload="metadata"
          aria-label={`Quote card for ${title}`}
        />
      )}

      <p className={s.actions}>
        {downloads.map((download) => (
          <a
            key={download.format}
            className={s.download}
            href={download.url}
            download={download.url.split("/").pop() ?? `${download.format}.mp4`}
          >
            {download.label}
          </a>
        ))}
      </p>
    </aside>
  );
}
