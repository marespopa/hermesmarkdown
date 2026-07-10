import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

// CM6 port of utils/typewriter-insert.ts — reveals `text` into the editor a
// few characters at a time instead of all at once, mirroring the effect
// VoicePreviewPanel uses in its own (isolated, cheap) preview box.
//
// The original textarea version used execCommand("insertText", ...) per
// chunk specifically so each one landed on the browser's native undo stack.
// CM6 has its own history() — each dispatched chunk here is tagged with the
// same userEvent ("input.type") so CM6's history groups them into one undo
// step, same practical effect via the CM6-native mechanism instead.
export function typewriterInsertCM6(
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
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: chunk },
      selection: EditorSelection.cursor(pos + chunk.length),
      userEvent: "input.type",
    });
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

  // Cancel (finishing instantly) the moment the user does anything else
  // with the editor — clicking, typing, or moving focus away — so the
  // animation can never fight the user's own edits.
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
