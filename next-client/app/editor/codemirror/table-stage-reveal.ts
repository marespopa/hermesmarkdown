import type { EditorState } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { firstGap, revealTablesIn, STAGED_CHUNK_LINES, type Range } from "./table-stages";

// Drives a large note's staged table reveal (table-stages.ts): the tables on
// screen are found right after the text is painted (and wherever the note
// scrolls), the rest of the note's in idle chunks of STAGED_CHUNK_LINES.
// Tables appearing off screen keep the screen still: CodeMirror holds the
// visible text in place when lines above it change height.
export function stagedTableReveal(covered: (state: EditorState) => Range[] | null) {
  return ViewPlugin.fromClass(
    class {
      idle: number | undefined;
      frame = 0;
      constructor(readonly view: EditorView) {
        if (covered(view.state)) this.revealScreen();
      }
      update(update: ViewUpdate) {
        if (!covered(update.state)) return this.stop();
        if (update.viewportChanged || update.docChanged) this.revealScreen();
      }
      // After the paint: the text first, then the screen's tables.
      revealScreen() {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => {
          const ranges = covered(this.view.state);
          if (!ranges) return;
          const { from, to } = this.view.viewport;
          if (!ranges.some((range) => range.from <= from && range.to >= to)) {
            this.view.dispatch({ effects: revealTablesIn.of({ from, to }) });
          }
          this.scheduleChunk();
        });
      }
      scheduleChunk() {
        if (this.idle !== undefined) return;
        const run = () => {
          this.idle = undefined;
          const ranges = covered(this.view.state);
          if (!ranges) return;
          const { doc } = this.view.state;
          const gap = firstGap(ranges, doc.length);
          if (!gap) return;
          const lastLine = Math.min(doc.lines, doc.lineAt(gap.from).number + STAGED_CHUNK_LINES - 1);
          this.view.dispatch({ effects: revealTablesIn.of({ from: gap.from, to: Math.min(gap.to, doc.line(lastLine).to) }) });
          this.scheduleChunk();
        };
        this.idle = typeof requestIdleCallback === "function"
          ? requestIdleCallback(run, { timeout: 2000 })
          : (setTimeout(run, 50) as unknown as number);
      }
      stop() {
        cancelAnimationFrame(this.frame);
        if (this.idle !== undefined) {
          if (typeof cancelIdleCallback === "function") cancelIdleCallback(this.idle);
          else clearTimeout(this.idle);
        }
        this.idle = undefined;
      }
      destroy() {
        this.stop();
      }
    },
  );
}
