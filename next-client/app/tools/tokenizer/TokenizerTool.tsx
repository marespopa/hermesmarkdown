"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { atom_tokenizerEncoding, atom_tokenizerText, type TokenizerEncoding } from "@/app/atoms/tool-atoms";
import Button from "@/app/components/Button";
import { Textarea } from "@/app/components/Input";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import { MAX_VISIBLE_TOKENS, textStats } from "./segment-tokens";
import { TOKENIZER_EXAMPLES } from "./tokenizer-examples";
import TokenView from "./TokenView";
import TokenizerOpenButton from "./TokenizerOpenButton";
import { useTokenizer } from "./use-tokenizer";

const ENCODINGS: { value: TokenizerEncoding; label: string; models: string }[] = [
  { value: "o200k_base", label: "o200k", models: "GPT-4o, GPT-4.1, GPT-5, o-series" },
  { value: "cl100k_base", label: "cl100k", models: "GPT-4, GPT-3.5 Turbo" },
];

const PANEL = "rounded-2xl border border-edge-subtle bg-surface-raised";
const CHIP = "h-8 px-3 rounded-full";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${PANEL} px-4 py-3`}>
      <dt className="text-ui-footnote text-fg-muted">{label}</dt>
      <dd className="text-ui-title-2 font-bold tabular-nums">{value}</dd>
    </div>
  );
}

// The tokenizer: text in, a live token count and every token highlighted.
// Tokenizing runs in a worker (use-tokenizer.ts); the text and encoding
// persist in this tab (tool-atoms.ts).
export default function TokenizerTool() {
  const [stored, setText] = useAtom(atom_tokenizerText);
  const [encoding, setEncoding] = useAtom(atom_tokenizerEncoding);
  const [showIds, setShowIds] = useState(false);
  const text = stored ?? TOKENIZER_EXAMPLES[0].text;
  const { result, loading, error } = useTokenizer(text, encoding);
  const { characters, words } = textStats(text);
  const tokens = result?.tokenCount ?? 0;
  const format = (n: number) => n.toLocaleString("en-US");
  const pending = loading && !result;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Examples">
          {TOKENIZER_EXAMPLES.map((example) => (
            <Button key={example.id} variant="outlined" className={CHIP} onClick={() => setText(example.text)}>
              {example.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.07]" role="group" aria-label="Tokenizer">
          {ENCODINGS.map((option) => (
            <Button
              key={option.value}
              variant="unstyled"
              aria-pressed={encoding === option.value}
              title={option.models}
              onClick={() => setEncoding(option.value)}
              className={`h-8 px-4 rounded-full text-ui-footnote font-semibold transition-colors ${
                encoding === option.value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Textarea
        name="tokenizer-text"
        label="Text"
        value={text}
        handleChange={(event) => setText(event.target.value)}
        placeholder="Paste or type any text…"
        spellCheck={false}
        textareaClassName="min-h-[180px] text-ui-callout"
        helperText={ENCODINGS.find((option) => option.value === encoding)?.models}
      />

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-live="polite">
        <Stat label="Tokens" value={pending ? "…" : format(tokens)} />
        <Stat label="Characters" value={format(characters)} />
        <Stat label="Words" value={format(words)} />
        <Stat label="Characters per token" value={tokens ? (characters / tokens).toFixed(1) : "–"} />
      </dl>

      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui-subhead font-semibold">Tokens</h2>
          <Button variant="outlined" className={CHIP} aria-pressed={showIds} onClick={() => setShowIds(!showIds)}>
            {showIds ? "Show text" : "Show token IDs"}
          </Button>
        </div>
        {error ? (
          <p className="text-ui-subhead text-accent">Couldn&apos;t load the tokenizer: {error}</p>
        ) : pending ? (
          <p className="text-ui-subhead text-fg-muted">Loading tokenizer…</p>
        ) : result && result.segments.length > 0 ? (
          <>
            <TokenView segments={result.segments} showIds={showIds} />
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

      <div className="flex flex-wrap items-center gap-3">
        <TokenizerOpenButton />
        <Button variant="outlined" onClick={() => setText("")} isDisabled={!text}>
          Clear
        </Button>
        {text.length > MAX_HANDOFF_CHARS && (
          <p className="text-ui-footnote text-fg-muted">Too long to open in the editor; copy it instead.</p>
        )}
      </div>
    </div>
  );
}
