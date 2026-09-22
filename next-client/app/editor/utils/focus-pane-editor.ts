export function focusPaneEditor(paneId: string) {
  const pane = Array.from(document.querySelectorAll<HTMLElement>("[data-pane-id]"))
    .find((element) => element.dataset.paneId === paneId);
  pane?.querySelector<HTMLElement>(".cm-content")?.focus();
}
