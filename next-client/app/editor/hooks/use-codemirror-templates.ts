"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import type { SlashMenuCallbacks } from "../codemirror/slash-menu";
import type { WikiLinkTriggerCallback } from "../codemirror/wikilink-trigger";

interface Range {
  from: number;
  to: number;
}

interface UseCodeMirrorTemplatesOptions {
  viewRef: React.RefObject<EditorView | null>;
  onFrontmatterWizard: () => void;
  onCodeBlockInserted: (pos: number) => void;
}

// Step 5: slash/template menu insertion targets. The actual menu UI is
// CM6's own autocomplete popup (see codemirror/slash-menu.ts); this hook
// only owns the "sentinel" dialogs a template can open (Link, WikiLink,
// Date) and performs the final text replacement once one is confirmed —
// mirrors insertLink/insertWikiLink/insertDate in the old
// use-editor-templates.ts.
export function useCodeMirrorTemplates({ viewRef, onFrontmatterWizard, onCodeBlockInserted }: UseCodeMirrorTemplatesOptions) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const linkRangeRef = useRef<Range | null>(null);

  const [wikiLinkDialogOpen, setWikiLinkDialogOpen] = useState(false);
  const wikiLinkRangeRef = useRef<Range | null>(null);

  const [templateDatePickerOpen, setTemplateDatePickerOpen] = useState(false);
  const dateRangeRef = useRef<Range | null>(null);

  const replaceRange = useCallback((range: Range, insert: string) => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(view.state.update({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.cursor(range.from + insert.length),
      userEvent: "input.replace.template",
    }));
    view.focus();
  }, [viewRef]);

  const insertLink = useCallback((label: string, url: string) => {
    const range = linkRangeRef.current;
    if (!range) return;
    replaceRange(range, `[${label}](${url})`);
    setLinkDialogOpen(false);
    linkRangeRef.current = null;
  }, [replaceRange]);

  const insertWikiLink = useCallback((name: string) => {
    const range = wikiLinkRangeRef.current;
    if (!range) return;
    replaceRange(range, `[[${name}]]`);
    setWikiLinkDialogOpen(false);
    wikiLinkRangeRef.current = null;
  }, [replaceRange]);

  const insertTemplateDate = useCallback((date: Date) => {
    const range = dateRangeRef.current;
    if (!range) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    replaceRange(range, `${y}-${m}-${d}`);
    setTemplateDatePickerOpen(false);
    dateRangeRef.current = null;
  }, [replaceRange]);

  const slashMenuCallbacksRef = useRef<SlashMenuCallbacks>({
    onOpenLinkDialog: (range) => {
      linkRangeRef.current = range;
      setLinkDialogOpen(true);
    },
    onOpenWikiLinkDialog: (range) => {
      wikiLinkRangeRef.current = range;
      setWikiLinkDialogOpen(true);
    },
    onOpenDatePicker: (range) => {
      dateRangeRef.current = range;
      setTemplateDatePickerOpen(true);
    },
    onFrontmatterWizard: () => onFrontmatterWizard(),
    onCodeBlockInserted: () => {},
  });
  // Keep the frontmatter callback current across renders (filePath can change).
  slashMenuCallbacksRef.current.onFrontmatterWizard = onFrontmatterWizard;
  slashMenuCallbacksRef.current.onCodeBlockInserted = onCodeBlockInserted;

  const wikiLinkTriggerRef = useRef<WikiLinkTriggerCallback | null>((_view, from, to) => {
    wikiLinkRangeRef.current = { from, to };
    setWikiLinkDialogOpen(true);
  });

  return {
    linkDialogOpen,
    setLinkDialogOpen,
    insertLink,
    wikiLinkDialogOpen,
    setWikiLinkDialogOpen,
    insertWikiLink,
    templateDatePickerOpen,
    setTemplateDatePickerOpen,
    insertTemplateDate,
    slashMenuCallbacksRef,
    wikiLinkTriggerRef,
  };
}
