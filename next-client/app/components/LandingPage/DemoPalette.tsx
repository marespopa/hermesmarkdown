"use client";

import type { IconType } from "react-icons";
import { HiOutlineCheckCircle, HiOutlineDocumentText, HiOutlineEye, HiOutlineLightningBolt, HiOutlineSearch } from "react-icons/hi";
import { fuzzyMatch } from "@/app/components/CommandPalette/command-search";
import { HighlightedText, PALETTE_FIELD_CLASS } from "@/app/components/CommandPalette/palette-model";
import DemoFrame, { DemoCaret, MarginMarks } from "./DemoFrame";
import { appliedSteps, typedText, useScriptLoop, type ScriptStep } from "./useScriptLoop";

// The command palette over a note, drawn with the palette's own classes
// (CommandPalette.tsx, PaletteSearchBar.tsx, PaletteRow.tsx) and filtered by
// its own matcher: Ctrl/Cmd+P opens it on recent notes and commands, a few
// letters narrow the list to one command, and the row is ready to run.
export const PALETTE_SCRIPT: readonly ScriptStep[] = [
  { pause: 700 },
  { key: "Mod+P" },
  { pause: 900 },
  { type: "pdf" },
  { pause: 3000 },
];

type DemoRow = { label: string; icon: IconType; folder?: string };

// Real names: notes from the sample vault, then commands as the palette lists them.
const ROWS: DemoRow[] = [
  { label: "Release plan", icon: HiOutlineDocumentText, folder: "projects" },
  { label: "Roadmap", icon: HiOutlineDocumentText, folder: "projects" },
  { label: "Search notes", icon: HiOutlineSearch },
  { label: "Open Tasks", icon: HiOutlineCheckCircle },
  { label: "Focus on / off", icon: HiOutlineEye },
  { label: "Export as PDF", icon: HiOutlineLightningBolt },
  { label: "Export as HTML", icon: HiOutlineLightningBolt },
];
const VISIBLE = 5;

function Palette({ query }: { query: string }) {
  const rows = ROWS.flatMap((row) => {
    const match = fuzzyMatch(query, row.label);
    return match ? [{ row, indices: match.indices, score: match.score }] : [];
  })
    .sort((a, b) => (query ? b.score - a.score : 0))
    .slice(0, VISIBLE);
  return (
    // The palette's backdrop and panel (CommandPalette.tsx), its height kept
    // so it doesn't jump as the list changes.
    <div className="absolute inset-0 flex items-start justify-center bg-surface/85 p-3 font-sans text-ui-footnote dark:bg-black/60 sm:p-6">
      <div className="glass-panel glass-panel-soft flex h-full w-full max-w-[600px] flex-col overflow-hidden rounded-xl">
        <div className={`${PALETTE_FIELD_CLASS} !h-11 sm:!h-14`}>
          <HiOutlineSearch size={18} className="shrink-0 text-fg-muted" />
          <span className="min-w-0 flex-1 truncate text-[15px] tracking-[-0.01em] text-fg sm:text-[17px]">
            {query}
            <DemoCaret />
            {!query && <span className="text-fg-faint">Search files or type a command...</span>}
          </span>
        </div>
        <ul className="py-1.5">
          {rows.map(({ row, indices }, index) => {
            const selected = index === 0;
            const Icon = row.icon;
            return (
              <li
                key={row.label}
                data-selected={selected || undefined}
                className={`mx-2 flex min-h-8 items-center justify-between gap-3 rounded-lg px-3 text-fg-muted sm:min-h-10 ${selected ? "bg-accent/15 text-fg" : ""}`}
              >
                <Icon size={16} className={`shrink-0 ${selected ? "text-fg" : "text-fg-muted"}`} />
                <span className="-ml-0.5 min-w-0 flex-1 truncate">
                  <HighlightedText text={row.label} indices={indices} />
                </span>
                {row.folder && <span className="shrink-0 text-fg-muted">{row.folder}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function DemoPalette() {
  const { ref, state } = useScriptLoop(PALETTE_SCRIPT);
  const open = appliedSteps(PALETTE_SCRIPT, state).some((step) => "key" in step);
  const query = typedText(PALETTE_SCRIPT, state);
  return (
    <DemoFrame
      frameRef={ref}
      label="The command palette: a few letters find a command, here Export as PDF."
      overlay={open && <Palette query={query} />}
    >
      <div className="cm-line cm-heading cm-heading-1 font-semibold">
        <MarginMarks marks="# " shown={false} />
        Release plan
      </div>
      <div className="cm-line">
        <br />
      </div>
      <div className="cm-line">
        The build is ready for review. Export and themes are done; the docs still need a pass.
        {!open && <DemoCaret />}
      </div>
    </DemoFrame>
  );
}
