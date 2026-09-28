"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { Textarea } from "@/app/components/Input";
import { applyRenderedBlockEdit } from "../codemirror/rendered-block";
import { openMermaidDialog, type RenderedBlockSourceRequest } from "../utils/open-helper-dialogs";
import { currentRenderTheme, renderBlock, type RenderResult } from "../utils/rendered-block-cache";

const PREVIEW_DELAY_MS = 250;

// Source editor for a rendered Mermaid diagram or math block. Opened by
// double-clicking the preview in the editor (or Ctrl/Cmd+Shift+Enter beside
// it); Save writes the body back as a single undoable change.
export default function RenderedBlockSourceDialog() {
  const [request, setRequest] = useState<RenderedBlockSourceRequest | null>(null);
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<RenderResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<RenderedBlockSourceRequest>).detail;
      if (!detail?.view || !detail.match) return;
      setRequest(detail);
      setDraft(detail.match.source);
      setPreview(null);
    };
    document.addEventListener("hermes:open-rendered-block-source", handler);
    return () => document.removeEventListener("hermes:open-rendered-block-source", handler);
  }, []);

  const kind = request?.match.kind;

  // Live preview, debounced so Mermaid doesn't re-render on every keystroke.
  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderBlock(kind, currentRenderTheme(), draft).then((result) => {
        if (!cancelled) setPreview(result);
      });
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [kind, draft]);

  useEffect(() => {
    if (request) requestAnimationFrame(() => textareaRef.current?.focus());
  }, [request]);

  const close = () => {
    const view = request?.view;
    setRequest(null);
    view?.focus();
  };

  const save = () => {
    if (request) applyRenderedBlockEdit(request.view, request.match, draft);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
    }
  };

  const isMermaid = kind === "mermaid";

  return (
    <DialogModal isOpened={request !== null} onClose={close} styles="!max-w-[1100px]" ariaLabelledBy="rendered-block-source-title">
      <div className="flex w-full min-w-0 flex-col gap-4">
        <h3 id="rendered-block-source-title" className="text-lg font-semibold">
          {isMermaid ? "Edit Mermaid diagram" : "Edit LaTeX formula"}
        </h3>
        <div className="grid min-h-0 gap-4 md:grid-cols-2">
          <Textarea
            ref={textareaRef}
            name="rendered-block-source"
            label={isMermaid ? "Mermaid source" : "LaTeX source"}
            value={draft}
            handleChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            rows={14}
            className="!my-0"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
          />
          <div className="flex min-h-[200px] flex-col gap-1.5">
            <span className="px-0.5 text-ui-footnote font-medium text-ink-muted dark:text-stone">Preview</span>
            <div
              className="rendered-block-dialog-preview flex-1 overflow-auto rounded-xl border border-edge bg-surface-raised p-4"
              aria-live="polite"
            >
              {!preview && <span className="text-fg-faint">Rendering…</span>}
              {preview?.error !== undefined && <span className="text-red-500">{preview.error}</span>}
              {preview?.html !== undefined && <div dangerouslySetInnerHTML={{ __html: preview.html }} />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {isMermaid && (
            <Button variant="tertiary" className="mr-auto h-11 px-4 rounded-xl" onClick={() => openMermaidDialog(draft)}>
              Open viewer
            </Button>
          )}
          <Button variant="secondary" className="h-11 px-6 rounded-xl" onClick={close}>Cancel</Button>
          <Button variant="primary" className="h-11 px-6 rounded-xl" onClick={save} title="Save (Ctrl/Cmd+Enter)">Save</Button>
        </div>
      </div>
    </DialogModal>
  );
}
