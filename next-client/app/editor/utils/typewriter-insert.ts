// Reveals `text` into a live textarea a few characters at a time instead of
// all at once, mirroring the effect VoicePreviewPanel uses in its own
// (isolated, cheap) preview box. Unlike that box, this textarea is the real
// react-simple-code-editor instance — every inserted character re-runs the
// full markdown highlight/table/pill detection pipeline via its own onChange,
// so:
//   - characters are revealed in chunks (more per tick for longer insertions)
//     instead of one at a time, bounding the total number of re-renders
//     regardless of how much text is being inserted;
//   - the animation is cancelled (finishing the rest instantly) the moment
//     the user does anything else with the textarea — clicking, typing, or
//     moving focus away — so it can never fight the user's own edits or leave
//     the cursor somewhere unexpected.
// Uses `execCommand("insertText", ...)` rather than a React state update so
// each chunk lands on the browser's native undo stack, same as real typing.
export function typewriterInsertText(
  textarea: HTMLTextAreaElement,
  text: string,
  options: { intervalMs?: number; onDone?: () => void } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 18;
  // Longer insertions reveal more characters per tick so the whole thing
  // settles in roughly the same amount of time either way.
  const chunkSize = Math.max(1, Math.ceil(text.length / 120));

  let revealed = 0;
  let done = false;

  textarea.focus();

  const finish = () => {
    if (done) return;
    done = true;
    cleanupListeners();
    clearInterval(timer);
    if (revealed < text.length) {
      document.execCommand("insertText", false, text.slice(revealed));
    }
    options.onDone?.();
  };

  const tick = () => {
    if (done) return;
    const next = Math.min(text.length, revealed + chunkSize);
    document.execCommand("insertText", false, text.slice(revealed, next));
    revealed = next;
    if (revealed >= text.length) finish();
  };

  const timer = setInterval(tick, intervalMs);
  tick();

  const cleanupListeners = () => {
    textarea.removeEventListener("mousedown", finish);
    textarea.removeEventListener("keydown", finish);
    textarea.removeEventListener("blur", finish);
  };
  textarea.addEventListener("mousedown", finish, { once: true });
  textarea.addEventListener("keydown", finish, { once: true });
  textarea.addEventListener("blur", finish, { once: true });

  return finish;
}
