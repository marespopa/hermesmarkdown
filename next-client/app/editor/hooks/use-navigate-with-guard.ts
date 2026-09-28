import { useCallback, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { atom_content, atom_lastSavedContent } from "@/app/atoms/atoms";
import { useDialog } from "@/app/hooks/use-dialog";

// Navigates away from the editor, first offering "Save & Leave" / "Discard"
// when the active note has unsaved changes. `navigatingLabel` drives the
// full-screen "<Label>..." overlay while the route loads.
export function useNavigateWithGuard(saveRef: React.RefObject<() => Promise<void>>) {
  const router = useRouter();
  const dialog = useDialog();
  const content = useAtomValue(atom_content);
  const lastSavedContent = useAtomValue(atom_lastSavedContent);
  const [navigatingLabel, setNavigatingLabel] = useState<string | null>(null);

  const navigateWithGuard = useCallback(async (path: string, label: string) => {
    const isDirty = content !== lastSavedContent && content.trim() !== "";
    if (!isDirty) {
      setNavigatingLabel(label);
      router.push(path);
      return;
    }
    const choice = await dialog.select(
      "You have unsaved changes.",
      [
        { label: "Save & Leave", value: "save" },
        { label: "Discard Changes", value: "discard" },
      ],
      "Unsaved Changes"
    );
    if (choice === "save") {
      await saveRef.current();
      setNavigatingLabel(label);
      router.push(path);
    } else if (choice === "discard") {
      setNavigatingLabel(label);
      router.push(path);
    }
  }, [content, lastSavedContent, router, dialog, saveRef]);

  return { navigateWithGuard, navigatingLabel };
}
