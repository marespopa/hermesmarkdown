// The Mermaid and image viewers listen for these document events, so any
// editor pane (pill button or Ctrl/Cmd+Shift+Enter) can open them.
export function openMermaidDialog(source: string) {
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "default";
  document.dispatchEvent(new CustomEvent("hermes:open-mermaid-dialog", {
    detail: { source, theme },
    bubbles: true,
  }));
}

export function openImageDialog(src: string, alt: string) {
  document.dispatchEvent(new CustomEvent("hermes:open-image-dialog", {
    detail: { src, alt },
    bubbles: true,
  }));
}
