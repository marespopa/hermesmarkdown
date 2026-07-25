"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAtomValue, useSetAtom } from "jotai";
import {
  atom_renderedFontFamily,
  atom_renderedFontSize,
  atom_lineHeight,
  atom_letterSpacing,
  atom_vaultHandle,
  atom_currentDirectoryHandle,
} from "@/app/atoms/atoms";
import { atom_activeMilkdownView, atom_activeEditorKind, atom_activeMilkdownCtx } from "@/app/atoms/ui-atoms";
import { savePastedImage, resolveVaultImageSrc } from "@/app/utils/paste-image";
import type { Ctx } from "@milkdown/kit/ctx";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { history } from "@milkdown/kit/plugin/history";
import { trailing } from "@milkdown/kit/plugin/trailing";
import { replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { FM_REGEX } from "@/app/utils/frontmatter-utils";
import { unescapeKnownMarkdownPatterns } from "../milkdown/markdown-escape";
import { shortcodeInputRules, calcInputRule, taskListItemView, calloutBlockquoteView, calloutMarkerDecorations, htmlPassthroughView, exitBlockOnShiftEnter, enterInLinkFix, configureHeadingKeymap, collapseEmptyHeadingKeymap, clipboardCopyFix, getSelectionCopyPayload } from "../milkdown/plugins";
import { codeBlockView } from "../milkdown/code-block-view";
import { remarkMathPlugin, inlineMathSchema, mathBlockSchema, inlineMathInputRule, inlineMathView, mathBlockView } from "../milkdown/math-schema";
import { slashMenu, configureSlashMenu, onOpenLinkDialogCtx, configureOpenLinkDialog, onOpenWikiLinkDialogCtx, configureOpenWikiLinkDialog } from "../milkdown/slash-menu";
import { wikiLinkClickPlugin, configureWikiLinkClick, onWikiLinkClickCtx, linkClickPlugin } from "../milkdown/wikilink-click";
import { linkPastePlugin } from "../milkdown/link-paste";
import { imagePastePlugin, onPasteImageCtx, configurePasteImage } from "../milkdown/image-paste";
import { imageView, onResolveImageSrcCtx, configureResolveImageSrc } from "../milkdown/image-view";
import { userInputTrackerPlugin, configureUserInputTracking, onUserInputCtx } from "../milkdown/user-input-tracker";
import { lifecycleTagDecorations } from "../milkdown/lifecycle-tags";
import {
  lifecycleTagCalloutPlugin,
  onTagCalloutUpdateCtx,
  configureTagCalloutUpdate,
  tagStates,
  type MilkdownTagInfo,
} from "../milkdown/lifecycle-tag-callout-plugin";
import { dateClickPlugin, onDateClickCtx, configureDateClick } from "../milkdown/date-picker";
import {
  tableCalloutPlugin,
  onTableCalloutUpdateCtx,
  configureTableCalloutUpdate,
  type MilkdownTableInfo,
} from "../milkdown/table-callout-plugin";
import {
  linkCalloutPlugin,
  onLinkCalloutUpdateCtx,
  configureLinkCalloutUpdate,
  type MilkdownLinkInfo,
} from "../milkdown/link-callout-plugin";
import {
  activeViewPlugin,
  onMilkdownViewReadyCtx,
  configureMilkdownViewReady,
} from "../milkdown/active-view-plugin";
import type { EditorView } from "@milkdown/kit/prose/view";
import { useMilkdownTable } from "../hooks/use-milkdown-table";
import { useMilkdownLink } from "../hooks/use-milkdown-link";
import { useMilkdownTagCallout } from "../hooks/use-milkdown-tag-callout";
import { TableCallout } from "./TableCallout";
import { LinkPill } from "./LinkPill";
import { TagStatusCallout } from "./TagStatusCallout";
import FrontmatterPanel from "./FrontmatterPanel";
import useIsMobile from "@/app/hooks/use-is-mobile";
import DatePickerCallout from "./DatePickerCallout";
import Button from "../../components/Button";
import Input from "../../components/Input";
import DialogModal from "../../components/DialogModal/DialogModal";
import WikiLinkDialog from "./WikiLinkDialog";
import TabContextMenu from "./TabContextMenu";

interface EditablePreviewProps {
  content: string;
  onChange: (value: string) => void;
  filePath?: string;
  onWikiLinkClick?: (name: string) => void;
  onTableCalloutUpdate?: (info: MilkdownTableInfo | null, view: EditorView) => void;
  onLinkCalloutUpdate?: (info: MilkdownLinkInfo | null, view: EditorView) => void;
  onTagCalloutUpdate?: (info: MilkdownTagInfo | null, view: EditorView) => void;
  isActivePane?: boolean;
}

function stripFrontmatter(content: string): { frontmatter: string; body: string } {
  const m = content.match(FM_REGEX);
  return { frontmatter: m ? m[0] : "", body: content.replace(FM_REGEX, "") };
}

// Bridges Milkdown's markdown-only doc model with atom_fileContent, which
// stores the full file (frontmatter + body) as one string. Frontmatter is
// re-spliced from the latest known content on every write-back so edits
// made elsewhere (FrontmatterPanel, a sibling CodeMirror pane) aren't lost,
// and external body changes are only pushed into the editor when they
// didn't originate from this instance's own last emission — otherwise
// every local keystroke would round-trip back in as a "remote" update and
// fight the caret.
function EditorHost({ content, onChange, onWikiLinkClick, onTableCalloutUpdate, onLinkCalloutUpdate, onTagCalloutUpdate, isActivePane }: EditablePreviewProps) {
  const latestContentRef = useRef(content);
  const lastEmittedBodyRef = useRef<string>(stripFrontmatter(content).body);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Rendered-mode counterpart to MarkdownEditor.tsx's atom_activeEditorView
  // registration — lets the global voice-input hook dictate at the real
  // cursor here instead of only ever targeting a CM6 view (see
  // active-view-plugin.ts and use-global-voice-input.ts).
  const [milkdownView, setMilkdownView] = useState<EditorView | null>(null);
  const [milkdownCtx, setMilkdownCtx] = useState<Ctx | null>(null);
  const setActiveMilkdownView = useSetAtom(atom_activeMilkdownView);
  const setActiveMilkdownCtx = useSetAtom(atom_activeMilkdownCtx);
  const setActiveEditorKind = useSetAtom(atom_activeEditorKind);
  const handleMilkdownViewReady = useCallback((view: EditorView | null, viewCtx?: Ctx) => {
    setMilkdownView(view);
    setMilkdownCtx(viewCtx ?? null);
  }, []);
  useEffect(() => {
    if (!isActivePane || !milkdownView || !milkdownCtx) return;
    setActiveMilkdownView(milkdownView);
    setActiveMilkdownCtx(milkdownCtx);
    setActiveEditorKind("milkdown");
    return () => {
      setActiveMilkdownView(null);
      setActiveMilkdownCtx(null);
      setActiveEditorKind((prev) => (prev === "milkdown" ? null : prev));
    };
  }, [isActivePane, milkdownView, milkdownCtx, setActiveMilkdownView, setActiveMilkdownCtx, setActiveEditorKind]);

  const vaultHandle = useAtomValue(atom_vaultHandle);
  const currentDirectoryHandle = useAtomValue(atom_currentDirectoryHandle);
  const pasteImageRef = useRef<(file: File) => Promise<string | null>>(null!);
  pasteImageRef.current = async (file: File) => {
    if (!vaultHandle) {
      toast.error("Open a vault folder before pasting images");
      return null;
    }
    try {
      return await savePastedImage(vaultHandle, currentDirectoryHandle, file);
    } catch (err: any) {
      console.warn("Failed to save pasted image:", err?.message || err);
      toast.error("Failed to save pasted image");
      return null;
    }
  };
  const resolveImageSrcRef = useRef<(src: string) => Promise<string | null>>(null!);
  resolveImageSrcRef.current = async (src: string) => {
    if (!vaultHandle) return null;
    try {
      return await resolveVaultImageSrc(vaultHandle, currentDirectoryHandle, src);
    } catch (err: any) {
      console.warn("Failed to resolve image src:", err?.message || err);
      return null;
    }
  };
  const onWikiLinkClickRef = useRef(onWikiLinkClick);
  onWikiLinkClickRef.current = onWikiLinkClick;
  const onTableCalloutUpdateRef = useRef(onTableCalloutUpdate);
  onTableCalloutUpdateRef.current = onTableCalloutUpdate;
  const onLinkCalloutUpdateRef = useRef(onLinkCalloutUpdate);
  onLinkCalloutUpdateRef.current = onLinkCalloutUpdate;
  const onTagCalloutUpdateRef = useRef(onTagCalloutUpdate);
  onTagCalloutUpdateRef.current = onTagCalloutUpdate;
  // Gates markdownUpdated write-back until the user has actually typed —
  // otherwise merely opening a file in preview mode re-serializes it
  // through Milkdown's canonical formatting and silently dirties content
  // nobody touched.
  const hasUserInteractedRef = useRef(false);
  const [datePicker, setDatePicker] = useState<{ date: Date; onSelect: (date: Date) => void } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ insert: (label: string, url: string) => void } | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const [wikiLinkDialog, setWikiLinkDialog] = useState<{ insert: (name: string) => void } | null>(null);
  const [copyMenu, setCopyMenu] = useState<{ x: number; y: number; source: string; text: string } | null>(null);

  const closeLinkDialog = () => setLinkDialog(null);
  const confirmLinkDialog = () => {
    if (!linkDialog) return;
    if (!linkUrl.trim()) return;
    linkDialog.insert(linkLabel, linkUrl);
    setLinkDialog(null);
  };

  const closeWikiLinkDialog = () => setWikiLinkDialog(null);
  const confirmWikiLinkDialog = (name: string) => {
    if (!wikiLinkDialog) return;
    wikiLinkDialog.insert(name);
    setWikiLinkDialog(null);
  };

  const { get } = useEditor((root) => {
    const { body } = stripFrontmatter(content);
    lastEmittedBodyRef.current = body;
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, body);
        ctx.get(listenerCtx).markdownUpdated((_ctx, rawMarkdown) => {
          if (!hasUserInteractedRef.current) return;
          const markdown = unescapeKnownMarkdownPatterns(rawMarkdown);
          if (markdown === lastEmittedBodyRef.current) return;
          lastEmittedBodyRef.current = markdown;
          const { frontmatter } = stripFrontmatter(latestContentRef.current);
          const next = frontmatter + markdown;
          latestContentRef.current = next;
          onChangeRef.current(next);
        });
        configureHeadingKeymap(ctx);
        configureSlashMenu(ctx);
        configureWikiLinkClick(ctx, (name) => onWikiLinkClickRef.current?.(name));
        configureDateClick(ctx, (payload) => setDatePicker(payload));
        configureOpenLinkDialog(ctx, (insert) => {
          setLinkLabel("");
          setLinkUrl("");
          setLinkDialog({ insert });
        });
        configureOpenWikiLinkDialog(ctx, (insert) => {
          setWikiLinkDialog({ insert });
        });
        configureUserInputTracking(ctx, () => {
          hasUserInteractedRef.current = true;
        });
        configureTableCalloutUpdate(ctx, (info, view) => onTableCalloutUpdateRef.current?.(info, view));
        configureLinkCalloutUpdate(ctx, (info, view) => onLinkCalloutUpdateRef.current?.(info, view));
        configureTagCalloutUpdate(ctx, (info, view) => onTagCalloutUpdateRef.current?.(info, view));
        configureMilkdownViewReady(ctx, handleMilkdownViewReady);
        configurePasteImage(ctx, (file) => pasteImageRef.current(file));
        configureResolveImageSrc(ctx, (src) => resolveImageSrcRef.current(src));
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(linkPastePlugin)
      .use(onPasteImageCtx)
      .use(imagePastePlugin)
      .use(onResolveImageSrcCtx)
      .use(imageView)
      .use(clipboardCopyFix)
      .use(clipboard)
      .use(history)
      .use(trailing)
      .use(taskListItemView)
      .use(calloutBlockquoteView)
      .use(calloutMarkerDecorations)
      .use(htmlPassthroughView)
      .use(exitBlockOnShiftEnter)
      .use(enterInLinkFix)
      .use(collapseEmptyHeadingKeymap)
      .use(codeBlockView)
      .use(remarkMathPlugin)
      .use(inlineMathSchema)
      .use(mathBlockSchema)
      .use(inlineMathInputRule)
      .use(inlineMathView)
      .use(mathBlockView)
      .use(onWikiLinkClickCtx)
      .use(wikiLinkClickPlugin)
      .use(linkClickPlugin)
      .use(lifecycleTagDecorations)
      .use(onTagCalloutUpdateCtx)
      .use(lifecycleTagCalloutPlugin)
      .use(onDateClickCtx)
      .use(dateClickPlugin)
      .use(onUserInputCtx)
      .use(userInputTrackerPlugin)
      .use(shortcodeInputRules)
      .use(calcInputRule)
      .use(onTableCalloutUpdateCtx)
      .use(tableCalloutPlugin)
      .use(onLinkCalloutUpdateCtx)
      .use(linkCalloutPlugin)
      .use(onMilkdownViewReadyCtx)
      .use(activeViewPlugin)
      .use(onOpenLinkDialogCtx)
      .use(onOpenWikiLinkDialogCtx)
      .use(slashMenu);
  }, []);

  useEffect(() => {
    latestContentRef.current = content;
    const { body } = stripFrontmatter(content);
    if (body === lastEmittedBodyRef.current) return;
    lastEmittedBodyRef.current = body;
    const editor = get();
    editor?.action(replaceAll(body));
  }, [content, get]);

  // Ctrl+C already copies visible text (clipboardCopyFix), matching what's
  // selected on screen. Some users still want the raw markdown behind a
  // selection (e.g. pasting a callout into another markdown doc) — this
  // right-click menu is the explicit escape hatch, offering both without
  // guessing which one Ctrl+C should default to.
  const handleContextMenu = (event: React.MouseEvent) => {
    const editor = get();
    if (!editor) return;
    const payload = editor.action((ctx) => getSelectionCopyPayload(ctx));
    if (!payload) return;
    event.preventDefault();
    setCopyMenu({ x: event.clientX, y: event.clientY, ...payload });
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        <Milkdown />
      </div>
      {copyMenu && (
        <TabContextMenu
          x={copyMenu.x}
          y={copyMenu.y}
          onClose={() => setCopyMenu(null)}
          items={[
            {
              label: "Copy text",
              onClick: () => {
                navigator.clipboard.writeText(copyMenu.text);
                toast.success("Copied text");
              },
            },
            {
              label: "Copy source",
              onClick: () => {
                navigator.clipboard.writeText(copyMenu.source);
                toast.success("Copied markdown source");
              },
            },
          ]}
        />
      )}
      {datePicker && (
        <DatePickerCallout
          isOpen
          initialDate={datePicker.date}
          onSelectDate={(date) => {
            datePicker.onSelect(date);
            setDatePicker(null);
          }}
          onClose={() => setDatePicker(null)}
        />
      )}
      {linkDialog && (
        <DialogModal
          isOpened
          onClose={closeLinkDialog}
          styles="!max-w-sm"
          ariaLabelledBy="preview-link-insert-heading"
        >
          <div className="flex flex-col gap-5">
            <h2 id="preview-link-insert-heading" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
              Add Link
            </h2>

            <Input
              name="preview-link-label"
              label="Text"
              value={linkLabel}
              handleChange={(e) => setLinkLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); linkUrlInputRef.current?.focus(); }
                if (e.key === "Escape") closeLinkDialog();
              }}
              autoFocus
              placeholder="Link text"
              className="my-0"
            />

            <Input
              ref={linkUrlInputRef}
              name="preview-link-url"
              label="URL"
              type="text"
              value={linkUrl}
              handleChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmLinkDialog(); }
                if (e.key === "Escape") closeLinkDialog();
              }}
              placeholder="https://"
              className="my-0"
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outlined" onClick={closeLinkDialog}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmLinkDialog}>
                Insert
              </Button>
            </div>
          </div>
        </DialogModal>
      )}
      <WikiLinkDialog
        isOpen={!!wikiLinkDialog}
        onClose={closeWikiLinkDialog}
        onConfirm={confirmWikiLinkDialog}
        title="Insert WikiLink"
      />
    </>
  );
}

export default function EditablePreview({ content, onChange, filePath, onWikiLinkClick, isActivePane }: EditablePreviewProps) {
  // Its own font atoms, distinct from the source editor's — the Rendered
  // surface reads like a finished document rather than raw markdown, so it
  // gets a serif/proportional default instead of the editor's monospace.
  // Line height and letter spacing still follow Source (atom_lineHeight,
  // atom_letterSpacing) since those aren't part of this split.
  const fontFamily = useAtomValue(atom_renderedFontFamily);
  const fontSize = useAtomValue(atom_renderedFontSize);
  const lineHeight = useAtomValue(atom_lineHeight);
  const letterSpacing = useAtomValue(atom_letterSpacing);
  const isMobile = useIsMobile(768);

  const containerRef = useRef<HTMLDivElement>(null);
  const {
    tableInfo, calloutPos, currentAlignment, isOnHeader, canRemoveRow, canRemoveCol, cursorDataRowNumber,
    handleRemoveTable, handleCycleAlign, handleCopyCSV, handleAddRow, handleRemoveRow,
    handleAddColumn, handleRemoveColumn, handleSortColumn,
    onTableCalloutUpdate,
  } = useMilkdownTable({ containerRef });

  const {
    linkInfo, pillPos, onLinkCalloutUpdate, handleOpenLink, handleSaveLink, handleDismissLink,
  } = useMilkdownLink({ containerRef });

  const {
    tagInfo, calloutPos: tagCalloutPos, onTagCalloutUpdate, handleSelectState,
  } = useMilkdownTagCallout({ containerRef });

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12">
      <div className="max-w-3xl mx-auto mb-4" style={{ fontFamily, fontSize }}>
        <FrontmatterPanel
          filePath={filePath || "draft"}
          content={content}
          onChange={onChange}
          fontFamily={fontFamily}
          displayFontSize={fontSize}
          isMobile={isMobile}
        />
      </div>
      <div
        className="prose dark:prose-invert prose-neutral max-w-3xl mx-auto prose-headings:font-bold prose-a:text-sage prose-a:cursor-pointer prose-code:before:content-none prose-code:after:content-none focus:outline-none [&_.milkdown]:outline-none [&_.ProseMirror]:outline-none [&_.task-list-item_p]:my-0 [&_ul:has(>.task-list-item)]:pl-0 [&_.callout-marker-hidden]:hidden [&_.callout-title-text]:font-semibold [&_.wikilink-text]:text-sage [&_.wikilink-text]:font-bold [&_.wikilink-text]:underline [&_.wikilink-text]:cursor-pointer"
        style={{ fontFamily, fontSize, lineHeight, letterSpacing }}
      >
        <MilkdownProvider>
          <EditorHost
            content={content}
            onChange={onChange}
            onWikiLinkClick={onWikiLinkClick}
            onTableCalloutUpdate={onTableCalloutUpdate}
            onLinkCalloutUpdate={onLinkCalloutUpdate}
            onTagCalloutUpdate={onTagCalloutUpdate}
            isActivePane={isActivePane}
          />
        </MilkdownProvider>
      </div>

      {tagInfo && (
        <TagStatusCallout
          tag={tagInfo.tag}
          states={tagStates(tagInfo.isWorkflow)}
          pos={tagCalloutPos}
          onSelect={handleSelectState}
        />
      )}

      {tableInfo && (
        <TableCallout
          pos={calloutPos}
          isMobile={isMobile}
          currentAlignment={currentAlignment}
          isOnHeader={isOnHeader}
          canRemoveRow={canRemoveRow}
          canRemoveCol={canRemoveCol}
          cursorDataRowNumber={cursorDataRowNumber}
          onAddRow={handleAddRow}
          onRemoveRow={handleRemoveRow}
          onAddColumn={handleAddColumn}
          onRemoveColumn={handleRemoveColumn}
          onSortAsc={() => handleSortColumn("asc")}
          onSortDesc={() => handleSortColumn("desc")}
          onCycleAlign={handleCycleAlign}
          onRemoveTable={handleRemoveTable}
          onCopyCSV={handleCopyCSV}
          onEditDialog={() => {}}
        />
      )}

      {linkInfo && (
        <LinkPill
          url={linkInfo.href}
          label={linkInfo.label}
          pos={pillPos}
          type="url"
          onOpen={handleOpenLink}
          onSave={handleSaveLink}
          onDismiss={handleDismissLink}
        />
      )}
    </div>
  );
}
