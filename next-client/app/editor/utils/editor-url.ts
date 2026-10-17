// The editor's URLs. Every place you can be has one, so a refresh or a
// shared link lands back on it:
//   /editor?file=<vault path>   the note in the focused tab
//   /editor                     the draft
//   /editor/tasks, /editor/templates, /editor/trash, /editor/files
//   /editor/tags?tag=<tag>
//   /editor/settings?section=<id>
// Query parameters inside a page are rewritten in place (replaceUrlParam),
// which the App Router keeps in sync with useSearchParams.

export const FILE_PARAM = "file";
export const SECTION_PARAM = "section";
export const TAG_PARAM = "tag";

// Query strings keep a path's slashes readable (`?file=notes/plan.md`):
// they're valid there, and the params read back the same.
function serialize(params: URLSearchParams): string {
  return params.toString().replace(/%2F/gi, "/");
}

// The editor showing `path` ("draft", or none, is the bare editor).
export function editorFileHref(path?: string | null): string {
  if (!path || path === "draft") return "/editor";
  return `/editor?${serialize(new URLSearchParams({ [FILE_PARAM]: path }))}`;
}

export function readUrlParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

// Sets (or, with null, removes) one query parameter without a navigation or
// a history entry. No-op when it already has that value.
export function replaceUrlParam(name: string, value: string | null): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get(name) === value) return;
  if (value === null) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  url.search = serialize(url.searchParams);
  window.history.replaceState(window.history.state, "", url);
}
