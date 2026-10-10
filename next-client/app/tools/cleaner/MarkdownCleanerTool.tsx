"use client";

import React, { useDeferredValue, useMemo } from "react";
import { useAtom } from "jotai";
import { atom_cleanerFormat, atom_cleanerInput, type CleanerFormat } from "@/app/atoms/tool-atoms";
import Button from "@/app/components/Button";
import { Textarea } from "@/app/components/Input";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import { CLEANER_EXAMPLES } from "./cleaner-examples";
import CleanerFixReport from "./CleanerFixReport";
import CleanerOpenButton from "./CleanerOpenButton";
import { convertInput, FORMAT_LABELS } from "./convert-input";
import { hasMarkdownStructure } from "./html-to-markdown";

const FORMATS: { value: CleanerFormat; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "markdown", label: FORMAT_LABELS.markdown },
  { value: "html", label: FORMAT_LABELS.html },
  { value: "csv", label: FORMAT_LABELS.csv },
];

const PANEL = "rounded-2xl border border-edge-subtle bg-surface-raised";
const CHIP = "h-8 px-3 rounded-full";

// The Markdown Cleaner: messy Markdown, HTML, rich text or CSV on the left,
// clean CommonMark/GFM on the right (stacked on narrow screens), recomputed
// as you type, with a report of every fix. A rich paste (web page, Google
// Docs, Word) brings its HTML along so the formatting converts. Input and
// format persist in this tab (tool-atoms.ts).
export default function MarkdownCleanerTool() {
  const [stored, setInput] = useAtom(atom_cleanerInput);
  const [choice, setChoice] = useAtom(atom_cleanerFormat);
  const input = stored ?? CLEANER_EXAMPLES[0].text;
  const deferredInput = useDeferredValue(input);
  const result = useMemo(() => convertInput(deferredInput, choice), [deferredInput, choice]);
  const output = result.markdown;

  // Rich text carries an HTML version; take it (in place of the plain text)
  // when it has structure worth converting.
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (choice !== "auto" && choice !== "html") return;
    const html = event.clipboardData.getData("text/html");
    if (!html || !hasMarkdownStructure(html)) return;
    event.preventDefault();
    const { value, selectionStart, selectionEnd } = event.currentTarget;
    setInput(value.slice(0, selectionStart) + html + value.slice(selectionEnd));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      showCopyToast("Markdown copied");
    } catch {
      showErrorToast("Couldn't copy. Select the Markdown and copy it instead.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Examples">
          {CLEANER_EXAMPLES.map((example) => (
            <Button
              key={example.id}
              variant="outlined"
              className={CHIP}
              onClick={() => {
                setInput(example.text);
                setChoice("auto");
              }}
            >
              {example.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.07]" role="group" aria-label="Input format">
          {FORMATS.map((option) => (
            <Button
              key={option.value}
              variant="unstyled"
              aria-pressed={choice === option.value}
              onClick={() => setChoice(option.value)}
              className={`h-8 px-3 sm:px-4 rounded-full text-ui-footnote font-semibold transition-colors ${
                choice === option.value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <Textarea
            name="cleaner-input"
            label="Paste here"
            value={input}
            handleChange={(event) => setInput(event.target.value)}
            onPaste={handlePaste}
            placeholder="Paste Markdown, HTML, rich text or CSV…"
            spellCheck={false}
            textareaClassName="font-mono min-h-[420px] text-ui-footnote"
            helperText={
              choice === "auto"
                ? `Detected: ${FORMAT_LABELS[result.format]}. Rich text keeps its formatting; paste as plain text to drop it.`
                : "Rich text keeps its formatting; paste as plain text to drop it."
            }
          />
        </div>
        <div className="min-w-0 flex flex-col gap-1.5 my-2">
          <p className="text-ui-footnote font-medium text-fg-muted px-0.5">Clean Markdown</p>
          <div className={`${PANEL} p-4 h-[420px] overflow-auto`}>
            {output ? (
              <pre className="font-mono text-ui-footnote text-fg whitespace-pre-wrap break-words" aria-label="Clean Markdown">
                {output}
              </pre>
            ) : (
              <p className="text-ui-subhead text-fg-muted">Paste something to clean.</p>
            )}
          </div>
          {output && <CleanerFixReport format={result.format} fixes={result.fixes} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CleanerOpenButton />
        <Button variant="outlined" onClick={copy} isDisabled={!output}>
          Copy Markdown
        </Button>
        <Button variant="outlined" onClick={() => setInput("")} isDisabled={!input}>
          Clear
        </Button>
        {output.length > MAX_HANDOFF_CHARS && (
          <p className="text-ui-footnote text-fg-muted">Too long to open in the editor; copy it instead.</p>
        )}
      </div>
    </div>
  );
}
