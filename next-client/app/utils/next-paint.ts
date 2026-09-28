// Resolves once the browser has painted the current frame. The first rAF runs
// just before the next paint; the second one runs after that paint landed.
// Use it to let a UI change (closing a dialog, showing a loading bar) reach
// the screen before starting work that blocks the main thread, or to wait
// until a heavy React/CodeMirror update has been committed and drawn.
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
