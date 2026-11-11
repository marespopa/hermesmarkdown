"use client";

import { useAtomValue } from "jotai";
import { atom_tokenizerText } from "@/app/atoms/tool-atoms";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import OpenInWorkspaceButton from "../components/OpenInWorkspaceButton";
import { TOKENIZER_EXAMPLES } from "./tokenizer-examples";

// "Open in HermesMarkdown" for the tokenizer: the text goes into the
// editor's draft as it is. Used in the tool and in the page's pitch block,
// both reading the same atom.
export default function TokenizerOpenButton({ variant = "primary" }: { variant?: "primary" | "outlined" }) {
  const text = useAtomValue(atom_tokenizerText) ?? TOKENIZER_EXAMPLES[0].text;
  return (
    <OpenInWorkspaceButton
      source="tokenizer"
      title="Tokenized text"
      getMarkdown={() => text}
      disabled={!text.trim() || text.length > MAX_HANDOFF_CHARS}
      variant={variant}
    />
  );
}
