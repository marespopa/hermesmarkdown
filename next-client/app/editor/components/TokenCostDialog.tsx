"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import TokenCostTable from "@/app/tools/token-cost/TokenCostTable";
import { useTokenizer } from "@/app/tools/tokenizer/use-tokenizer";
import { TOKEN_COST_EVENT } from "../utils/open-helper-dialogs";

// The open note's token count and what sending it to each model costs
// (input only: a reply's length can't be known here).
// Mounted only while the dialog is open, so the tokenizer worker (and its
// vocabulary) loads on first use, never with the editor.
function TokenCostBody() {
  const content = useAtomValue(atom_content);
  const fileName = useAtomValue(atom_fileName);
  const { result, loading, error } = useTokenizer(content, "o200k_base", { countOnly: true });
  const inputTokens = loading && !result ? null : (result?.tokenCount ?? 0);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="space-y-1 pr-10">
        <h3 id="token-cost-title" className="text-lg font-semibold">Token cost</h3>
        <p className="text-ui-subhead text-fg-muted truncate">
          {fileName || "Untitled"} ·{" "}
          <span className="tabular-nums" aria-live="polite">
            {inputTokens === null ? "counting…" : `${inputTokens.toLocaleString("en-US")} tokens`}
          </span>
        </p>
      </div>
      {error ? (
        <p className="text-ui-subhead text-accent">Couldn&apos;t load the tokenizer: {error}</p>
      ) : (
        <TokenCostTable inputTokens={inputTokens} />
      )}
    </div>
  );
}

// Opened with `hermes:open-token-cost` (More → Token Cost, or the command
// palette's "Token cost of this note").
export default function TokenCostDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener(TOKEN_COST_EVENT, handler);
    return () => document.removeEventListener(TOKEN_COST_EVENT, handler);
  }, []);

  return (
    <DialogModal isOpened={open} onClose={() => setOpen(false)} ariaLabelledBy="token-cost-title">
      {open && <TokenCostBody />}
    </DialogModal>
  );
}
