"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_renderedFontFamily, atom_renderedFontSize, atom_lineHeight, atom_letterSpacing } from "@/app/atoms/atoms";
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
import { shortcodeInputRules, calcInputRule, taskListItemView, calloutBlockquoteView, calloutMarkerDecorations, htmlPassthroughView, exitBlockOnShiftEnter, configureHeadingKeymap, collapseEmptyHeadingKeymap } from "../milkdown/plugins";
import { codeBlockView } from "../milkdown/code-block-view";
import { remarkMathPlugin, inlineMathSchema, mathBlockSchema, inlineMathInputRule, inlineMathView, mathBlockView } from "../milkdown/math-schema";
import { slashMenu, configureSlashMenu } from "../milkdown/slash-menu";
import { wikiLinkClickPlugin, configureWikiLinkClick, onWikiLinkClickCtx, linkClickPlugin } from "../milkdown/wikilink-click";
import { userInputTrackerPlugin, configureUserInputTracking, onUserInputCtx } from "../milkdown/user-input-tracker";
import { lifecycleTagDecorations } from "../milkdown/lifecycle-tags";
import { dateClickPlugin, onDateClickCtx, configureDateClick } from "../milkdown/date-picker";
import {
  tableCalloutPlugin,
  onTableCalloutUpdateCtx,
  configureTableCalloutUpdate,
  type MilkdownTableInfo,
} from "../milkdown/table-callout-plugin";
import type { EditorView } from "@milkdown/kit/prose/view";
import { useMilkdownTable } from "../hooks/use-milkdown-table";
import { TableCallout } from "./TableCallout";
import useIsMobile from "@/app/hooks/use-is-mobile";
import DatePickerCallout from "./DatePickerCallout";

interface EditablePreviewProps {
  content: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (name: string) => void;
  onTableCalloutUpdate?: (info: MilkdownTableInfo | null, view: EditorView) => void;
}

function stripFrontmatter(content: string): { frontmatter: string; body: string } {
  const m = content.match(FM_REGEX);
  return { frontmatter: m ? m[0] : "", body: content.replace(FM_REGEX, "") };
}

// mdast-util-to-markdown escapes a literal "[" wherever it could be
// mistaken for the start of link/reference syntax on a future parse.
// Two shapes of that bite us here, since both are just plain text to the
// schema (no dedicated node/mark) rather than something the serializer
// recognizes and re-emits verbatim:
//   - callout markers ("> [!note]") at the start of a blockquote line
//   - wikilinks ("[[Name]]") anywhere inline — only the opening "[[" gets
//     escaped, not the closing "]]"
// Left alone, the first Milkdown save would rewrite these to "> \[!note]"
// and "\[\[Name]]" on disk — breaking recognition in codemirror/highlight.ts,
// CalloutBlockquoteView, and the wikilink-click plugin's own regex, none of
// which know about the escape. Undone here, right before the markdown
// leaves Milkdown, so the file on disk stays in the canonical form every
// other surface expects.
//
// Also strips Milkdown's own "preserve empty line" placeholder: its
// paragraph serializer (preset-commonmark's paragraphSchema.toMarkdown)
// deliberately writes a literal "<br />" for any structurally-empty,
// non-top-level-last paragraph (an empty task item, an empty callout body
// line, …) so the blank line survives a markdown round-trip. That's
// intentional upstream behavior — disabling it outright was tried and
// rejected, since it makes empty GFM task items lose their "[ ] " checkbox
// marker entirely on save — but literal "<br />" showing up in a saved
// note reads as a bug, not a feature, from the user's side. Stripped here
// only when it's the last thing on its line (so a legitimate hand-typed
// "<br>" line break in the *middle* of a GFM table cell, the one case
// HtmlPassthroughView still renders on load, survives); the structural
// blank line itself collapses to nothing on the next parse, same as
// leaving any other consecutive blank line non-preserved.
//
// One case is deliberately exempt: a GFM task item whose "<br />" is the
// ONLY thing after "[ ]"/"[x]" — verified directly against
// @milkdown/preset-gfm's own parser that an empty checkbox with nothing
// after it ("- [ ] " with any amount of trailing whitespace, no "<br />")
// is not recognized as a task item at all on the next parse; it silently
// degrades to a plain bullet whose text literally reads "[ ]", losing the
// checkbox entirely. That's a worse, silent-corruption failure mode than a
// visible "<br />", so this one case keeps it — every other empty-line
// placeholder (plain paragraphs, callout body lines, non-task list items)
// is stripped unconditionally.
const TASK_CHECKBOX_ONLY_BR = /\[[ xX]\]\s*<br \/>[ \t]*$/;
function unescapeKnownMarkdownPatterns(markdown: string): string {
  const withEscapesFixed = markdown
    .replace(/^((?:>\s*)+)\\\[!/gm, "$1[!")
    .replace(/\\\[\\\[([^\]]+)\]\]/g, "[[$1]]");
  return withEscapesFixed
    .split("\n")
    .map((line) => (TASK_CHECKBOX_ONLY_BR.test(line) ? line : line.replace(/<br \/>[ \t]*$/, "")))
    .join("\n");
}

// Bridges Milkdown's markdown-only doc model with atom_fileContent, which
// stores the full file (frontmatter + body) as one string. Frontmatter is
// re-spliced from the latest known content on every write-back so edits
// made elsewhere (FrontmatterPanel, a sibling CodeMirror pane) aren't lost,
// and external body changes are only pushed into the editor when they
// didn't originate from this instance's own last emission — otherwise
// every local keystroke would round-trip back in as a "remote" update and
// fight the caret.
function EditorHost({ content, onChange, onWikiLinkClick, onTableCalloutUpdate }: EditablePreviewProps) {
  const latestContentRef = useRef(content);
  const lastEmittedBodyRef = useRef<string>(stripFrontmatter(content).body);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onWikiLinkClickRef = useRef(onWikiLinkClick);
  onWikiLinkClickRef.current = onWikiLinkClick;
  const onTableCalloutUpdateRef = useRef(onTableCalloutUpdate);
  onTableCalloutUpdateRef.current = onTableCalloutUpdate;
  // Gates markdownUpdated write-back until the user has actually typed —
  // otherwise merely opening a file in preview mode re-serializes it
  // through Milkdown's canonical formatting and silently dirties content
  // nobody touched.
  const hasUserInteractedRef = useRef(false);
  const [datePicker, setDatePicker] = useState<{ date: Date; onSelect: (date: Date) => void } | null>(null);

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
        configureUserInputTracking(ctx, () => {
          hasUserInteractedRef.current = true;
        });
        configureTableCalloutUpdate(ctx, (info, view) => onTableCalloutUpdateRef.current?.(info, view));
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(clipboard)
      .use(history)
      .use(trailing)
      .use(taskListItemView)
      .use(calloutBlockquoteView)
      .use(calloutMarkerDecorations)
      .use(htmlPassthroughView)
      .use(exitBlockOnShiftEnter)
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
      .use(onDateClickCtx)
      .use(dateClickPlugin)
      .use(onUserInputCtx)
      .use(userInputTrackerPlugin)
      .use(shortcodeInputRules)
      .use(calcInputRule)
      .use(onTableCalloutUpdateCtx)
      .use(tableCalloutPlugin)
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

  return (
    <>
      <Milkdown />
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
    </>
  );
}

export default function EditablePreview({ content, onChange, onWikiLinkClick }: EditablePreviewProps) {
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

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12">
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
          />
        </MilkdownProvider>
      </div>

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
    </div>
  );
}
