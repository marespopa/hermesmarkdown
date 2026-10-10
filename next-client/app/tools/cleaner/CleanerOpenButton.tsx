"use client";

import { useAtomValue } from "jotai";
import { atom_cleanerFormat, atom_cleanerInput } from "@/app/atoms/tool-atoms";
import OpenInWorkspaceButton from "../components/OpenInWorkspaceButton";
import { CLEANER_EXAMPLES } from "./cleaner-examples";
import { convertInput } from "./convert-input";

export const CLEANER_HANDOFF_TITLE = "Clean Markdown";

// "Open in HermesMarkdown" for the Markdown Cleaner: the clean Markdown goes
// into the editor's draft as it is. Used in the tool and in the page's pitch
// block, both reading the same atoms. The conversion runs on click (it needs
// the DOM, and the pitch block also renders on the server); over-long
// output gets the handoff's "too large" toast.
export default function CleanerOpenButton({ variant = "primary" }: { variant?: "primary" | "outlined" }) {
  const input = useAtomValue(atom_cleanerInput) ?? CLEANER_EXAMPLES[0].text;
  const format = useAtomValue(atom_cleanerFormat);
  return (
    <OpenInWorkspaceButton
      source="markdown-cleaner"
      title={CLEANER_HANDOFF_TITLE}
      getMarkdown={() => convertInput(input, format).markdown}
      disabled={!input.trim()}
      variant={variant}
    />
  );
}
