import Link from "next/link";
import { objectPosition } from "@/lib/focal";
import styles from "./StoryCard.module.scss";

export type CardStory = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  coverFocalX: number;
  coverFocalY: number;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks} week${wks === 1 ? "" : "s"} ago`;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Johannesburg",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Story card in the front-page style: image, bold headline, byline row
 * (author — published relative time), three-line excerpt. The whole card is
 * one link to the story's own page, so the story a reader taps is the story
 * the address bar names.
 */
export default function StoryCard({ story }: { story: CardStory }) {
  // Stamped at request time; a story whose date cannot be read prints the
  // author alone rather than a stranded "Published".
  const stamp = timeAgo(story.publishedAt || story.createdAt);

  return (
    <article className={styles.card}>
      <Link href={`/story/${story.slug}`} className={styles.cardLink}>
        {story.coverImage && (
          <img
            src={story.coverImage}
            alt=""
            width={1200}
            height={675}
            style={{
              objectPosition: objectPosition(
                story.coverFocalX,
                story.coverFocalY,
              ),
            }}
            className={styles.cardImage}
          />
        )}
        <div className={styles.cardBody}>
          <h3 className={`${styles.cardTitle} font-display clamp-3`}>
            {story.title}
          </h3>
          <p className={styles.byline}>
            {story.authorName && (
              <span className={styles.bylineAuthor}>{story.authorName}</span>
            )}
            {story.authorName && (
              <span className={styles.bylineSeparator} aria-hidden="true">
                |
              </span>
            )}
            {stamp ? (
              <span className={styles.bylineTime}>Published {stamp}</span>
            ) : null}
          </p>
          {story.excerpt && (
            <p className={`${styles.excerpt} clamp-3`}>{story.excerpt}</p>
          )}
        </div>
      </Link>
    </article>
  );
}
