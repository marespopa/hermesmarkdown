// Mermaid worker: runs in a dedicated module worker to keep parsing/rendering off the main thread.
import mermaid from "mermaid";

self.addEventListener("message", async (ev) => {
  const { id, source, theme } = ev.data || {};
  try {
    mermaid.initialize({ startOnLoad: false, theme: theme || "default", securityLevel: "strict" });
    const name = `m-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const res = await mermaid.render(name, source);
    // res.svg is a string
    (self as any).postMessage({ id, svg: res.svg });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    (self as any).postMessage({ id, error: message });
  }
});
