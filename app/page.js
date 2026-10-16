import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p>This website is still under construction.</p>
        </div>
        <Image
          className={styles.logo}
          src="/opinionLogo.svg"
          alt="Opinion logo"
          width={600}
          height={120}
          priority
        />
        <div className={styles.intro}>
          <h1>Welcome to The Opinion Weekly</h1>
          <p>Where Every Opinion Matters.</p>
        </div>
      </main>
    </div>
  );
}
