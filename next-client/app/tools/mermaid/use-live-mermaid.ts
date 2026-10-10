"use client";

import { useEffect, useRef, useState } from "react";
import { renderMermaid, type MermaidTheme } from "@/app/editor/utils/render-mermaid";

export interface LiveMermaid {
  // The last diagram that rendered; kept while the source has an error.
  svg: string | null;
  error: string | null;
  loading: boolean;
}

// Follows the site theme (html.dark), as the editor's inline diagrams do.
function useMermaidTheme(): MermaidTheme {
  const [theme, setTheme] = useState<MermaidTheme>("default");
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains("dark") ? "dark" : "default");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

// Renders `source` with Mermaid `delayMs` after it last changed, and again
// when the theme changes. A reply to an older render is dropped, so a slow
// render never replaces a newer one. `mermaid` itself loads on the first
// render (render-mermaid.ts).
export function useLiveMermaid(source: string, delayMs = 400): LiveMermaid {
  const theme = useMermaidTheme();
  const latestRef = useRef(0);
  const [state, setState] = useState<LiveMermaid>({ svg: null, error: null, loading: true });

  useEffect(() => {
    const id = ++latestRef.current;
    if (!source.trim()) {
      setState({ svg: null, error: null, loading: false });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const svg = await renderMermaid(source, theme);
        if (id === latestRef.current) setState({ svg, error: null, loading: false });
      } catch (error) {
        if (id !== latestRef.current) return;
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({ svg: previous.svg, error: message, loading: false }));
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [source, theme, delayMs]);

  return state;
}
