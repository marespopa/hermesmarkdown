// The editor's URLs. Every place you can be has one, so a refresh or a
// shared link lands back on it:
//   /editor?file=<vault path>   the note in the focused tab
//   /editor                     the draft
//   /editor/tasks, /editor/templates, /editor/trash, /editor/files
//   /editor/tags?tag=<tag>      (editorTagHref; the page follows changes to it)
//   /editor/replace?find=<text>&regex=1   (editorReplaceHref; Replace in Files)
//   /editor/settings?section=<id>
// Query parameters inside a page are rewritten in place (replaceUrlParam),
// which the App Router keeps in sync with useSearchParams.

export const FILE_PARAM = "file";
export const SECTION_PARAM = "section";
export const TAG_PARAM = "tag";
export const FILTER_PARAM = "filter";
export const FIND_PARAM = "find";
export const REGEX_PARAM = "regex";

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

// The Tags page on `tag` (a pinned tag's link).
export function editorTagHref(tag: string): string {
  return `/editor/tags?${serialize(new URLSearchParams({ [TAG_PARAM]: tag }))}`;
}

// The Tags page on a system filter ("all", "untagged" or "todo").
export function editorNoteFilterHref(filter: string): string {
  return `/editor/tags?${serialize(new URLSearchParams({ [FILTER_PARAM]: filter }))}`;
}

// Replace in Files, optionally prefilled with a Find text (and Regex on).
export function editorReplaceHref(find?: string, regex?: boolean): string {
  const params = new URLSearchParams();
  if (find) params.set(FIND_PARAM, find);
  if (find && regex) params.set(REGEX_PARAM, "1");
  const query = serialize(params);
  return query ? "/editor/replace?" + query : "/editor/replace";
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
  // null, not history.state: the App Router's replaceState patch skips its
  // sync for state carrying its own markers (`__NA`), which would leave its
  // idea of the current URL stale and drop later <Link> navigations. It
  // copies its internal state into the entry itself.
  window.history.replaceState(null, "", url);
}
