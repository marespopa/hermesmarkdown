// Vim mode (@replit/codemirror-vim) is a large library most people never
// turn on, so it's loaded on demand instead of shipping with the editor.
// Callers await `loadVim()` before enabling it; synchronous code (key
// handlers, status reads) uses `loadedVim()`, which is null until then.
type VimModule = typeof import("@replit/codemirror-vim");

let loaded: VimModule | null = null;
let loading: Promise<VimModule> | null = null;

export function loadVim(): Promise<VimModule> {
  loading ??= import("@replit/codemirror-vim").then((module) => (loaded = module));
  return loading;
}

export function loadedVim(): VimModule | null {
  return loaded;
}
