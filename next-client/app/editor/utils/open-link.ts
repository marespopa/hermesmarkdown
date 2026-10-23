// Links rendered as HTML inside the editor (table cells) can't reach the
// pane's callbacks directly: a file link is sent up the editor's DOM as this
// event, its `detail` the link's href, and `useCodeMirrorFeatures` opens it.
export const FILE_LINK_EVENT = "hermes:open-file-link";

// A href with a scheme (`https:`, `mailto:`) or a `//host` is a web link;
// anything else is a path into the vault.
export function isWebHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}
