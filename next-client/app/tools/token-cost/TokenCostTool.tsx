"use client";

import { useAtom } from "jotai";
import { atom_tokenCostOutputTokens, atom_tokenCostText } from "@/app/atoms/tool-atoms";
import Button from "@/app/components/Button";
import Input, { Textarea } from "@/app/components/Input";
import { MAX_HANDOFF_CHARS } from "@/app/utils/tool-handoff";
import { TOKENIZER_EXAMPLES } from "../tokenizer/tokenizer-examples";
import { useTokenizer } from "../tokenizer/use-tokenizer";
import { MAX_OUTPUT_TOKENS, parseTokenCount } from "./model-prices";
import TokenCostOpenButton from "./TokenCostOpenButton";
import TokenCostTable from "./TokenCostTable";

// The token cost calculator: text in (the prompt), the expected length of
// the model's answer, and what both cost on each model. Counting runs in the
// tokenizer worker (o200k); the text and reply length persist in this tab
// (tool-atoms.ts).
export default function TokenCostTool() {
  const [stored, setText] = useAtom(atom_tokenCostText);
  const [outputTokens, setOutputTokens] = useAtom(atom_tokenCostOutputTokens);
  const text = stored ?? TOKENIZER_EXAMPLES[0].text;
  const { result, loading, error } = useTokenizer(text, "o200k_base", { countOnly: true });
  const inputTokens = loading && !result ? null : (result?.tokenCount ?? 0);

  return (
    <div className="space-y-5">
      <Textarea
        name="token-cost-text"
        label="Prompt or document"
        value={text}
        handleChange={(event) => setText(event.target.value)}
        placeholder="Paste or type the text you'll send…"
        spellCheck={false}
        textareaClassName="min-h-[180px] text-ui-callout"
      />

      <div className="grid gap-3 sm:grid-cols-2 items-end">
        <div className="rounded-2xl border border-edge-subtle bg-surface-raised px-4 py-3" aria-live="polite">
          <p className="text-ui-footnote text-fg-muted">Input tokens</p>
          <p className="text-ui-title-2 font-bold tabular-nums">
            {inputTokens === null ? "…" : inputTokens.toLocaleString("en-US")}
          </p>
        </div>
        <Input
          name="token-cost-output"
          label="Reply length (tokens)"
          type="number"
          value={outputTokens}
          validation={{ min: 0, max: MAX_OUTPUT_TOKENS }}
          handleChange={(event) => setOutputTokens(parseTokenCount(event.target.value))}
          helperText="Models also charge for the answer they write, at a higher rate. 0 prices only your text."
          className="!my-0"
        />
      </div>

      {error ? (
        <p className="text-ui-subhead text-accent">Couldn&apos;t load the tokenizer: {error}</p>
      ) : (
        <TokenCostTable inputTokens={inputTokens} outputTokens={outputTokens} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <TokenCostOpenButton />
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
