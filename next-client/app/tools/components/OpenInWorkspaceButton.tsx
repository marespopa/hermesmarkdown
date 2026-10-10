"use client";

import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { showErrorToast } from "@/app/components/Toastr";
import {
  buildToolHandoff,
  toolEditorUrl,
  writeToolHandoff,
  type ToolHandoffSource,
} from "@/app/utils/tool-handoff";

interface Props {
  source: ToolHandoffSource;
  // The draft's name in the editor.
  title: string;
  getMarkdown: () => string;
  disabled?: boolean;
  variant?: "primary" | "outlined";
  className?: string;
}

// Carries the tool's result into the editor's draft: the Markdown goes to
// this tab's sessionStorage (app/utils/tool-handoff.ts) and the editor picks
// it up on arrival. Same tab on purpose: a new tab wouldn't see it.
export default function OpenInWorkspaceButton({
  source,
  title,
  getMarkdown,
  disabled = false,
  variant = "primary",
  className = "",
}: Props) {
  const router = useRouter();

  const open = () => {
    const result = writeToolHandoff(buildToolHandoff(source, title, getMarkdown()));
    if (result === "ok") router.push(toolEditorUrl(source));
    else if (result === "too-large") showErrorToast("Too large to open in the workspace. Copy the text instead.");
    else showErrorToast("Couldn't open the workspace from here. Copy the text instead.");
  };

  return (
    <Button variant={variant} onClick={open} isDisabled={disabled} className={className}>
      Open in HermesMarkdown
    </Button>
  );
}
