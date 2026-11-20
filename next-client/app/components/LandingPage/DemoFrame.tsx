import type { ReactNode, RefObject } from "react";
import { QUATTRO_FONT_STACK } from "@/app/atoms/ui-atoms";

// The home page's demos are drawn with the editor's own stylesheet
// (editor.scss and editor-typography.scss, loaded for every page by
// app/layout.tsx): the frame is an `.editor-sheet.editor-container`, the text
// sits in a `.cm-content` of `.cm-line`s, and tables and diagrams use the
// editor's `.cm-table-preview` and `.cm-rendered-block`. So a demo looks like
// the editor, and follows it, and the theme picker, when either changes.
// The few rules that live in CodeMirror themes (scoped to an editor, so not
// reachable here) are restated below, each beside its source.

/** The shared editor sheet (4:3 on a phone, 16:9 from `sm`) every home page demo is drawn in, framed as a window: rounded, a hairline edge and a soft shadow. The aspect box is reserved before anything draws, so nothing shifts. To assistive technology it is one labelled image; its content is hidden. */
export default function DemoFrame({
  label,
  frameRef,
  overlay,
  sidebar,
  children,
}: {
  label: string;
  frameRef?: RefObject<HTMLDivElement | null>;
  /** Drawn over the page (the command palette), outside the text column. */
  overlay?: ReactNode;
  /** The editor's sidebar, drawn at the left with the note beside it. */
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={label}
      // The editor's default face (Quattro) at a size that fits the box.
      style={{ fontFamily: QUATTRO_FONT_STACK }}
      className="editor-sheet editor-container relative aspect-[4/3] w-full sm:aspect-video overflow-hidden rounded-xl border border-edge-subtle text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_60px_-20px_rgb(0_0_0/0.25)] [--editor-font-size:14px] sm:[--editor-font-size:16px]"
    >
      <div aria-hidden="true" className={sidebar ? "flex h-full" : undefined}>
        {sidebar}
        {/* The left padding is the margin a heading's `#` hangs in. */}
        <div className="cm-content min-w-0 flex-1 whitespace-pre-wrap py-5 pl-9 pr-6 sm:py-8 sm:pl-14 sm:pr-10">
          {children}
        </div>
      </div>
      {overlay && <div aria-hidden="true">{overlay}</div>}
    </div>
  );
}

/** The editor's caret (theme.ts `.cm-cursor`: 2px in the caret colour), blinking; still under reduced motion. */
export function DemoCaret() {
  return (
    <span
      data-caret
      className="-mr-0.5 inline-block h-[1.2em] w-0.5 bg-[var(--caret)] align-text-bottom [animation:blink_1.2s_step-end_infinite] motion-reduce:[animation:none]"
    />
  );
}

/** A Markdown mark shown while being edited (highlight.ts dims marks to the faint ink). */
export const MARK = "text-fg-faint";

/**
 * A heading's `#`s in the margin (live-markers-theme.ts `.cm-marginMarks`):
 * out of the text flow, shrunk to 60%, shown only on the caret's line and kept
 * in place, unseen, elsewhere, so revealing them never moves the text.
 */
export function MarginMarks({ marks, shown }: { marks: string; shown: boolean }) {
  return (
    <span
      data-margin-marks={shown ? "shown" : "hidden"}
      className={`absolute origin-[right_70%] -translate-x-full scale-[0.6] whitespace-pre font-normal tracking-normal ${MARK} ${shown ? "" : "invisible"}`}
    >
      {marks}
    </span>
  );
}
