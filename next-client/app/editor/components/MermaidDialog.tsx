"use client";

import React, { useEffect, useState } from "react";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { normalizeMermaidTheme as normalizeTheme, renderMermaid, type MermaidTheme } from "../utils/render-mermaid";
import MermaidViewer from "./MermaidViewer";

// Full-size viewer for a diagram in a note, opened with
// `hermes:open-mermaid-dialog`. The viewer itself (zoom, fit, pan,
// download) is MermaidViewer, shared with the Mermaid tool page.
export default function MermaidDialog() {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const detail = ce.detail as { source: string; theme?: string };
      if (!detail || !detail.source) return;
      openAndRender(detail.source, normalizeTheme(detail.theme));
    };
    document.addEventListener("hermes:open-mermaid-dialog", handler as EventListener);
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("hermes:open-mermaid-dialog", handler as EventListener);
      }
    };
  }, []);

  const openAndRender = async (source: string, theme: MermaidTheme) => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setSvg(null);
    try {
      setSvg(await renderMermaid(source, theme));
    } catch (err: any) {
      setError(err?.message || "Failed to render diagram");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogModal
      isOpened={open}
      onClose={() => setOpen(false)}
      styles="!max-w-[1200px] !rounded-3xl !backdrop-blur-lg"
    >
      <div className="w-full min-w-0">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Mermaid Diagram</h3>
        </div>
        <MermaidViewer svg={svg} loading={loading} error={error} fit="always" />
      </div>
    </DialogModal>
  );
}
