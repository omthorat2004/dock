"use client";

import { useState } from "react";
import { CreateSpaceModal } from "@/components/spaces/create-space-modal";
import { buttonStyles } from "@/components/ui/button";
import { useCreateSpace } from "@/hooks/use-spaces";

/**
 * The "Create a space" button and the modal behind it, kept together so every
 * surface that offers the action gets the same mutation, pending state and
 * error handling.
 */
export function CreateSpaceButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const createSpace = useCreateSpace();

  function close() {
    createSpace.reset();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles("primary", className)}
      >
        Create a space
      </button>

      {/* Mounted only while open, so the form resets itself on every close. */}
      {open ? (
        <CreateSpaceModal
          open
          onClose={close}
          submitting={createSpace.isPending}
          error={createSpace.error?.message}
          onCreate={({ lesson, syllabus }) =>
            createSpace.mutate(
              { lesson_name: lesson, topics: syllabus },
              { onSuccess: () => setOpen(false) },
            )
          }
        />
      ) : null}
    </>
  );
}
