import s from "@/app/StoryQuoteCard.module.scss";

/**
 * The finished quote card for this story, shown under the article when one has
 * been rendered. Silent, nine seconds, cut for Instagram, Reels and Stories —
 * see quote-cards/README.md for how cards are made and uploaded.
 *
 * Rendered only when the card exists in Object Storage, so a story without one
 * carries no empty slot.
 */
export default function StoryQuoteCard({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const filename = url.split("/").pop() ?? "quote-card.mp4";

  return (
    <aside className={s.card}>
      <h2 className={`${s.heading} font-display`}>Share this piece</h2>
      <p className={`${s.note} font-ui`}>
        A nine-second card for Instagram, Reels and Stories.
      </p>
      <video
        className={s.video}
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={`Quote card for ${title}`}
      />
      <p className={s.actions}>
        <a className={s.download} href={url} download={filename}>
          Download the card
        </a>
      </p>
    </aside>
  );
}
