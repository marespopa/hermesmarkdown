"use client";

import { useAtomValue } from "jotai";
import { atom_mermaidToolSource } from "@/app/atoms/tool-atoms";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import OpenInWorkspaceButton from "../components/OpenInWorkspaceButton";
import { MERMAID_HANDOFF_TITLE, mermaidHandoffMarkdown } from "../utils/tool-markdown";
import { MERMAID_EXAMPLES } from "./mermaid-examples";

// "Open in HermesMarkdown" for the Mermaid tool: hands over
// `# Mermaid diagram` and the fenced block, which the editor renders inline.
// Used in the tool and in the page's pitch block; both read the same atom.
export default function MermaidOpenButton({ variant = "primary" }: { variant?: "primary" | "outlined" }) {
  const source = useAtomValue(atom_mermaidToolSource) ?? MERMAID_EXAMPLES[0].source;
  const markdown = mermaidHandoffMarkdown(source);
  return (
    <OpenInWorkspaceButton
      source="mermaid"
      title={MERMAID_HANDOFF_TITLE}
      getMarkdown={() => markdown}
      disabled={!source.trim() || markdown.length > MAX_HANDOFF_CHARS}
      variant={variant}
    />
  );
}
