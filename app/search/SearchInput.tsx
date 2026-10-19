"use client";
import { useEffect, useRef } from "react";
import styles from "./Search.module.scss";

/**
 * The search page's field. It takes focus on arrival — a search page whose
 * field needs a second click is a small rudeness — but only where a pointer
 * can click into it anyway: on a phone, stealing focus opens the keyboard and
 * covers the results the reader came to see.
 */
export default function SearchInput({ defaultValue }: { defaultValue: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, []);

  return (
    <input
      ref={ref}
      type="search"
      name="q"
      defaultValue={defaultValue}
      placeholder="Name, place or phrase…"
      aria-label="Search stories"
      className={`${styles.input} font-ui`}
    />
  );
}
