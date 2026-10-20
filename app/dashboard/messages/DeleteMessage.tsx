"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMessage } from "@/app/contact/action";
import ms from "./Messages.module.scss";

/**
 * The admin's delete for one message. Confirm first — there is no undo — then
 * let the server action take the row and refresh the inbox.
 */
export default function DeleteMessage({
  id,
  subject,
}: {
  id: number;
  subject: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={`${ms.deleteButton} font-ui`}
      onClick={() => {
        if (
          !window.confirm(
            `Delete "${subject}" permanently? This cannot be undone.`,
          )
        )
          return;
        startTransition(async () => {
          try {
            await deleteMessage(id);
            toast.success("Message deleted.");
            router.refresh();
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Could not delete the message",
            );
          }
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
