import type { EditorView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";

// Rendered-mode counterpart to codemirror/typewriter-insert.ts's
// typewriterInsertCM6 — same chunked reveal, same "cancel the instant the
// user does anything else" behavior, ported to ProseMirror's
// transaction/dispatch API instead of CM6's.
export function typewriterInsertMilkdown(
  view: EditorView,
  text: string,
  options: { intervalMs?: number; onDone?: () => void } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 18;
  const chunkSize = Math.max(1, Math.ceil(text.length / 120));

  let revealed = 0;
  let done = false;

  view.focus();

  const insertChunk = (chunk: string) => {
    const pos = view.state.selection.from;
    const tr = view.state.tr.insertText(chunk, pos, pos);
    tr.setSelection(TextSelection.create(tr.doc, pos + chunk.length));
    view.dispatch(tr);
  };

  const finish = () => {
    if (done) return;
    done = true;
    cleanupListeners();
    clearInterval(timer);
    if (revealed < text.length) {
      insertChunk(text.slice(revealed));
      revealed = text.length;
    }
    options.onDone?.();
  };

  const tick = () => {
    if (done) return;
    const next = Math.min(text.length, revealed + chunkSize);
    insertChunk(text.slice(revealed, next));
    revealed = next;
    if (revealed >= text.length) finish();
  };

  const timer = setInterval(tick, intervalMs);
  tick();

  const dom = view.dom;
  const handleInteraction = () => finish();
  const cleanupListeners = () => {
    dom.removeEventListener("mousedown", handleInteraction);
    dom.removeEventListener("keydown", handleInteraction);
    dom.removeEventListener("blur", handleInteraction);
  };
  dom.addEventListener("mousedown", handleInteraction, { once: true });
  dom.addEventListener("keydown", handleInteraction, { once: true });
  dom.addEventListener("blur", handleInteraction, { once: true });

  return finish;
}
