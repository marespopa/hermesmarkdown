"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useAtom } from "jotai";
import { atom_tokenizerEncoding, atom_tokenizerText, type TokenizerEncoding } from "@/app/atoms/tool-atoms";
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import { Textarea } from "@/app/components/Input";
import TextLink from "@/app/components/TextLink";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import TokenCostTable from "../token-cost/TokenCostTable";
import { MAX_VISIBLE_TOKENS, textStats } from "./segment-tokens";
import { TOKENIZER_EXAMPLES } from "./tokenizer-examples";
import TokenView from "./TokenView";
import TokenizerOpenButton from "./TokenizerOpenButton";
import { useTokenizer } from "./use-tokenizer";

const ENCODINGS: { value: TokenizerEncoding; label: string; models: string }[] = [
  { value: "o200k_base", label: "o200k", models: "GPT-4o, GPT-4.1, GPT-5, GPT-6, o-series" },
  { value: "cl100k_base", label: "cl100k", models: "GPT-4, GPT-3.5 Turbo" },
];

const encodingLabel = (value: TokenizerEncoding) => ENCODINGS.find((option) => option.value === value)?.label;

// Bigger files than this are refused: they'd only freeze the page.
const MAX_FILE_BYTES = 5_000_000;
const PANEL = "rounded-xl bg-surface-raised";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${PANEL} px-4 py-3`}>
      <dt className="text-ui-footnote text-fg-muted">{label}</dt>
      <dd className="text-ui-title-2 font-bold tabular-nums">{value}</dd>
    </div>
  );
}

async function copy(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    showCopyToast(message);
  } catch {
    showErrorToast("Couldn't copy to the clipboard.");
  }
}

// The tokenizer: text in, a live token count and every token highlighted.
// Tokenizing runs in a worker (use-tokenizer.ts); the text and encoding
// persist in this tab (tool-atoms.ts). The last result stays on screen,
// dimmed with a delayed "Updating…", while a change is being counted, and an
// encoding whose vocabulary fails to load is switched back.
export default function TokenizerTool() {
  const [stored, setText] = useAtom(atom_tokenizerText);
  const [encoding, setEncoding] = useAtom(atom_tokenizerEncoding);
  const [view, setView] = useState<"text" | "ids">("text");
  const [showWhitespace, setShowWhitespace] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const text = stored ?? TOKENIZER_EXAMPLES[0].text;
  const { result, loading, error, resultEncoding, stale } = useTokenizer(text, encoding);
  // The cost table prices o200k counts. Under cl100k it asks for its own.
  const cost = useTokenizer(text, "o200k_base", { countOnly: true, enabled: encoding !== "o200k_base" });
  const costResult = resultEncoding === "o200k_base" ? result : cost.result;
  const deferredText = useDeferredValue(text);
  const { characters, words } = useMemo(() => textStats(deferredText), [deferredText]);
  const tokens = result?.tokenCount ?? 0;
  const format = (n: number) => n.toLocaleString("en-US");
  const pending = loading && !result;

  // A failed switch: go back to the encoding that is still on screen.
  useEffect(() => {
    if (!error || !result || !resultEncoding || resultEncoding === encoding) return;
    setEncoding(resultEncoding);
    showErrorToast(`Couldn't load the ${encodingLabel(encoding)} tokenizer. Back to ${encodingLabel(resultEncoding)}.`);
  }, [error, result, resultEncoding, encoding, setEncoding]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showErrorToast("That file is over 5 MB: too large to tokenize here.");
      return;
    }
    try {
      setText(await file.text());
    } catch {
      showErrorToast("Couldn't read that file.");
    }
  };

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    void readFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    void readFile(event.dataTransfer.files[0]);
  };

  const ids = result?.segments.flatMap((segment) => segment.ids) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Examples">
          {TOKENIZER_EXAMPLES.map((example) => (
            <Button key={example.id} variant="outlined" onClick={() => setText(example.text)}>
              {example.label}
            </Button>
          ))}
        </div>
        <div className={`flex gap-0.5 ${SEGMENT_TRACK_CLASS}`} role="group" aria-label="Tokenizer">
          {ENCODINGS.map((option) => (
            <Button
              key={option.value}
              variant="segment"
              aria-pressed={encoding === option.value}
              title={option.models}
              onClick={() => setEncoding(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <Textarea
          name="tokenizer-text"
          label="Text"
          value={text}
          handleChange={(event) => setText(event.target.value)}
          placeholder="Paste or type any text, or drop a .md or .txt file…"
          spellCheck={false}
          textareaClassName="min-h-[180px] text-ui-callout"
          helperText={ENCODINGS.find((option) => option.value === encoding)?.models}
        />
      </div>

      <dl className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${stale ? "opacity-60 transition-opacity delay-150" : ""}`} aria-live="polite">
        <Stat label="Tokens" value={pending ? "…" : format(tokens)} />
        <Stat label="Characters" value={format(characters)} />
        <Stat label="Words" value={format(words)} />
        <Stat label="Characters per token" value={tokens ? (characters / tokens).toFixed(1) : "–"} />
      </dl>

      <div className={`${PANEL} p-4 space-y-3`} aria-busy={stale || pending}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-ui-subhead font-semibold">Tokens</h2>
            {stale && <span className="loading-bar-appear text-ui-footnote text-fg-muted">Updating…</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex gap-0.5 ${SEGMENT_TRACK_CLASS}`} role="group" aria-label="Show tokens as">
              <Button variant="segment" aria-pressed={view === "text"} onClick={() => setView("text")}>Text</Button>
              <Button variant="segment" aria-pressed={view === "ids"} onClick={() => setView("ids")}>IDs</Button>
            </div>
            <Button
              variant="outlined"
              aria-pressed={showWhitespace}
              isDisabled={view === "ids"}
              onClick={() => setShowWhitespace(!showWhitespace)}
            >
              Show spaces
            </Button>
            <Button
              variant="outlined"
              isDisabled={ids.length === 0 || !!result?.truncated}
              title={result?.truncated ? "Only the first tokens are listed, so their IDs aren't copied" : undefined}
              onClick={() => void copy(ids.join(", "), "Token IDs copied")}
            >
              Copy IDs
            </Button>
          </div>
        </div>
        <div className={stale ? "opacity-60 transition-opacity delay-150" : ""}>
          {error && !result ? (
            <p className="text-ui-subhead text-accent" role="alert">Couldn&apos;t load the tokenizer: {error}</p>
          ) : pending ? (
            <p className="text-ui-subhead text-fg-muted" role="status">Loading tokenizer…</p>
          ) : result && result.segments.length > 0 ? (
            <>
              <TokenView segments={result.segments} showIds={view === "ids"} showWhitespace={showWhitespace} />
              {result.truncated && (
                <p className="text-ui-footnote text-fg-muted">
                  Showing the first {format(MAX_VISIBLE_TOKENS)} tokens. The count covers all {format(tokens)}.
                </p>
              )}
            </>
          ) : (
            <p className="text-ui-subhead text-fg-muted">Type some text to see its tokens.</p>
          )}
        </div>
      </div>

      <section className={`space-y-3 ${stale || cost.stale ? "opacity-60 transition-opacity delay-150" : ""}`} aria-labelledby="tokenizer-cost">
        <h2 id="tokenizer-cost" className="text-ui-subhead font-semibold">What it costs as input</h2>
        <TokenCostTable inputTokens={costResult ? costResult.tokenCount : null} />
        <p className="text-ui-footnote text-fg-muted">
          <TextLink href="/tools/token-cost-calculator">Add the reply length</TextLink> to price the whole exchange.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <TokenizerOpenButton />
        <Button variant="outlined" onClick={() => fileInput.current?.click()}>
          Open file…
        </Button>
        <Button
          variant="outlined"
          isDisabled={pending || !result}
          onClick={() => void copy(`${format(tokens)} tokens`, "Token count copied")}
        >
          Copy count
        </Button>
        <Button variant="outlined" onClick={() => setText("")} isDisabled={!text}>
          Clear
        </Button>
        {text.length > MAX_HANDOFF_CHARS && (
          <p className="text-ui-footnote text-fg-muted">Too long to open in the editor; copy it instead.</p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".md,.markdown,.txt,text/plain,text/markdown"
          className="hidden"
          aria-label="Open a text file"
          onChange={onPickFile}
        />
      </div>
    </div>
  );
}
