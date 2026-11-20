"use client";

import type { ReactNode } from "react";
import DemoFrame, { DemoCaret, MARK, MarginMarks } from "./DemoFrame";
import { appliedSteps, typedText, useScriptLoop, type ScriptStep } from "./useScriptLoop";

// The home hero's demo: a short, silent loop of a note being typed, drawn by
// the page itself (no video file, no embed, nothing requested) in the
// editor's own styles. It shows the editor's first idea: Markdown marks show
// only where you are typing (a heading's `#` in the margin, `**` and a link's
// source while the caret touches them) and step aside once the caret moves
// on. List markers stay as typed. At the end the first task is ticked.
export const HERO_SCRIPT: readonly ScriptStep[] = [
  { type: "# Launch checklist\n\n- [ ] Write the **release notes**\n- [ ] Update the [changelog](log.md)\n- [ ] Tag the build" },
  { pause: 600 },
  { key: "Check" },
  { pause: 2800 },
];

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/;
const TASK = /^(- )\[( |x)\] /;

// A folded link (theme.ts `.cm-link-display`): the label in the link colour,
// a light underline and a ↗ after it.
const LINK =
  "inline-flex items-baseline gap-[0.2em] whitespace-nowrap px-[0.08em] font-medium text-[var(--link)] underline decoration-[color-mix(in_srgb,var(--link)_38%,transparent)] [text-decoration-thickness:0.06em] underline-offset-[0.16em] after:font-semibold after:opacity-70 after:content-['↗']";
// A done task's text (live-markers-theme.ts `.cm-task-done`).
const DONE = "text-fg-muted line-through decoration-[color-mix(in_srgb,var(--fg-muted)_45%,transparent)] [text-decoration-thickness:1px]";

// Inline marks show only while the caret touches their token; here the caret
// is always at the end of the line being typed.
function inline(text: string, caret: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let at = 0;
  for (let n = 0; rest; n++) {
    const found = INLINE.exec(rest);
    if (!found) {
      out.push(rest);
      break;
    }
    out.push(rest.slice(0, found.index));
    const end = at + found.index + found[0].length;
    const editing = caret && end === text.length;
    if (found[1] !== undefined) {
      out.push(
        editing && <span key={`a${n}`} className={MARK}>**</span>,
        <strong key={`b${n}`} className="font-semibold">{found[1]}</strong>,
        editing && <span key={`c${n}`} className={MARK}>**</span>,
      );
    } else if (editing) {
      out.push(<span key={`b${n}`} className={MARK}>[</span>, found[2], <span key={`c${n}`} className={MARK}>{`](${found[3]})`}</span>);
    } else {
      out.push(<span key={`b${n}`} data-link className={LINK}>{found[2]}</span>);
    }
    at = end;
    rest = rest.slice(found.index + found[0].length);
  }
  return out;
}

/** One note line as the editor draws it; marks show only with the caret on it. Also drawn by DemoFiles. */
export function Line({ text, caret }: { text: string; caret: boolean }) {
  if (text.startsWith("# ")) {
    return (
      <div className="cm-line cm-heading cm-heading-1 font-semibold">
        <MarginMarks marks="# " shown={caret} />
        {inline(text.slice(2), caret)}
        {caret && <DemoCaret />}
      </div>
    );
  }
  const task = TASK.exec(text);
  const done = task?.[2] === "x";
  return (
    <div className="cm-line">
      {task && (
        <>
          <span className={`whitespace-pre ${MARK}`}>{task[1]}</span>
          <span data-task={done ? "done" : "open"} className={`whitespace-pre ${done ? "text-[var(--task-done)]" : MARK}`}>
            {`[${task[2]}] `}
          </span>
        </>
      )}
      <span className={done ? DONE : undefined}>{inline(task ? text.slice(task[0].length) : text, caret)}</span>
      {caret && <DemoCaret />}
      {/* An empty line keeps its height, as CodeMirror's `<br>` does. */}
      {!text && !caret && <br />}
    </div>
  );
}

export default function LandingLoop() {
  const { ref, state } = useScriptLoop(HERO_SCRIPT);
  const checked = appliedSteps(HERO_SCRIPT, state).some((step) => "key" in step && step.key === "Check");
  const lines = typedText(HERO_SCRIPT, state).split("\n");
  if (checked) lines[2] = lines[2].replace("[ ]", "[x]");
  return (
    <DemoFrame frameRef={ref} label="A note being typed: Markdown marks show only on the line being edited.">
      {lines.map((text, index) => (
        <Line key={index} text={text} caret={index === lines.length - 1} />
      ))}
    </DemoFrame>
  );
}
