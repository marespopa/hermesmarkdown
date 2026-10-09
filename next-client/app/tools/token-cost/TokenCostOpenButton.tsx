"use client";

import { useAtomValue } from "jotai";
import { atom_tokenCostText } from "@/app/atoms/tool-atoms";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import OpenInWorkspaceButton from "../components/OpenInWorkspaceButton";
import { TOKENIZER_EXAMPLES } from "../tokenizer/tokenizer-examples";

// "Open in HermesMarkdown" for the token cost calculator: the text goes into
// the editor's draft as it is. Used in the tool and in the page's pitch
// block, both reading the same atom.
export default function TokenCostOpenButton({ variant = "primary" }: { variant?: "primary" | "outlined" }) {
  const text = useAtomValue(atom_tokenCostText) ?? TOKENIZER_EXAMPLES[0].text;
  return (
    <OpenInWorkspaceButton
      source="token-cost"
      title="Priced text"
      getMarkdown={() => text}
      disabled={!text.trim() || text.length > MAX_HANDOFF_CHARS}
      variant={variant}
    />
  );
}
