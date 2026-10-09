// The tab's sessionStorage, or nothing on the server (and where storage is
// blocked), in which case Jotai falls back to the initial value. Unlike its
// default localStorage getter, Jotai doesn't guard a custom one, so this must.
export function tabSessionStorage(): Storage {
  try {
    return window.sessionStorage;
  } catch {
    return undefined as unknown as Storage;
  }
}
