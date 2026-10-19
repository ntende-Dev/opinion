import styles from "./Feedback.module.scss";

export default function Feedback({
  kind = "error",
  children,
}: {
  kind?: "error" | "success";
  children: React.ReactNode;
}) {
  const tone = kind === "error" ? styles.error : styles.success;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`${styles.base} ${tone} font-ui`}
    >
      {children}
    </div>
  );
}
