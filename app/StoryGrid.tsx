import StoryCard, { type CardStory } from "@/app/StoryCard";
import styles from "./StoryGrid.module.scss";

/** The card grid: front page, section pages and search results all print
 *  stories the same way — two up, stacked on small screens, each card linking
 *  to the story's own page. */
export default function StoryGrid({ stories }: { stories: CardStory[] }) {
  return (
    <ul className={styles.grid}>
      {stories.map((story) => (
        <li key={story.id}>
          <StoryCard story={story} />
        </li>
      ))}
    </ul>
  );
}
