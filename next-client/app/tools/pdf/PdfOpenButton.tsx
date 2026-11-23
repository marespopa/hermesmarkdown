"use client";

import { useAtomValue } from "jotai";
import { atom_pdfToolMarkdown } from "@/app/atoms/tool-atoms";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import OpenInWorkspaceButton from "../components/OpenInWorkspaceButton";
import { PDF_SAMPLE } from "./pdf-sample";

export const PDF_HANDOFF_TITLE = "Markdown to PDF";

// "Open in HermesMarkdown" for the Markdown to PDF tool: the Markdown goes
// into the editor's draft as it is, where Export as PDF has the full page
// setup. Used in the tool and in the page's pitch block; both read
// `atom_pdfToolMarkdown`.
export default function PdfOpenButton({ variant = "primary" }: { variant?: "primary" | "outlined" }) {
  const markdown = useAtomValue(atom_pdfToolMarkdown) ?? PDF_SAMPLE;
  return (
    <OpenInWorkspaceButton
      source="markdown-pdf"
      title={PDF_HANDOFF_TITLE}
      getMarkdown={() => markdown}
      disabled={!markdown.trim() || markdown.length > MAX_HANDOFF_CHARS}
      variant={variant}
    />
  );
}
