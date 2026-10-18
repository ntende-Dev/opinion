export default function Feedback({
  kind = "error",
  children,
}: {
  kind?: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-[var(--color-accent)] bg-[#7f1d1d]/5 text-[var(--color-accent)]"
      : "border-green-700 bg-green-50 text-green-800";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mt-4 rounded border px-4 py-3 text-sm font-ui font-medium ${styles}`}
    >
      {children}
    </div>
  );
}
