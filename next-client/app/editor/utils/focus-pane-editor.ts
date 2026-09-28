function findPaneEditor(paneId: string) {
  const pane = Array.from(document.querySelectorAll<HTMLElement>("[data-pane-id]"))
    .find((element) => element.dataset.paneId === paneId);
  return pane?.querySelector<HTMLElement>(".cm-content") ?? null;
}

export function focusPaneEditor(paneId: string) {
  findPaneEditor(paneId)?.focus();
}

// Like focusPaneEditor, for an editor that is still mounting (CodeMirror
// loads asynchronously): retries each frame until it appears or time runs out.
export function focusPaneEditorWhenReady(paneId: string, timeoutMs = 2000) {
  const deadline = performance.now() + timeoutMs;
  const attempt = () => {
    const editor = findPaneEditor(paneId);
    if (editor) {
      editor.focus();
      return;
    }
    if (performance.now() < deadline) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}
