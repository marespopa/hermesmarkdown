"use client";

import { useAtomValue } from "jotai";
import { atom_tableToolMarkdown } from "@/app/atoms/tool-atoms";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import OpenInWorkspaceButton from "../components/OpenInWorkspaceButton";
import { TABLE_HANDOFF_TITLE, tableHandoffMarkdown } from "../utils/tool-markdown";
import { tableOutput } from "./table-output";
import { DEFAULT_TOOL_TABLE } from "./default-table";

// "Open in HermesMarkdown" for the table generator: hands over
// `# Markdown table` and the aligned table, formulas kept: the editor's grid
// keeps calculating them. Used in the tool and in the
// page's pitch block; both read `atom_tableToolMarkdown`.
export default function TableOpenButton({ variant = "primary" }: { variant?: "primary" | "outlined" }) {
  const doc = useAtomValue(atom_tableToolMarkdown) ?? DEFAULT_TOOL_TABLE;
  const output = tableOutput(doc, "formulas");
  return (
    <OpenInWorkspaceButton
      source="markdown-table"
      title={TABLE_HANDOFF_TITLE}
      getMarkdown={() => tableHandoffMarkdown(output)}
      disabled={!output || tableHandoffMarkdown(output).length > MAX_HANDOFF_CHARS}
      variant={variant}
    />
  );
}
