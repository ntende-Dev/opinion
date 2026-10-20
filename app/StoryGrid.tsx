import StoryCard, { type CardStory } from "@/app/StoryCard";
import styles from "./StoryGrid.module.scss";

/** The card grid: front page, section pages and search results all print
 *  stories the same way — two up, stacked on small screens, each card linking
 *  to the story's own page. */
export default function StoryGrid({
  stories,
  solo = false,
}: {
  stories: CardStory[];
  /** A desk page with one filing prints full measure instead of half width. */
  solo?: boolean;
}) {
  return (
    <ul className={solo ? `${styles.grid} ${styles.solo}` : styles.grid}>
      {stories.map((story) => (
        <li key={story.id}>
          <StoryCard story={story} />
        </li>
      ))}
    </ul>
  );
}
