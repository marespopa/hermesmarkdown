import { MODEL_PRICES, PRICES_AS_OF, formatUsd, isExactCount, modelCost } from "./model-prices";

interface Props {
  // Input tokens; null while the tokenizer is still loading.
  inputTokens: number | null;
  // The expected reply. Without it, one Cost column prices the input only.
  outputTokens?: number;
}

const CELL = "px-3 py-2 text-right tabular-nums";

// What `inputTokens` in and `outputTokens` out cost on each model in
// MODEL_PRICES. Shared by the calculator page (input, reply, total) and the
// editor's Token cost dialog (input only).
export default function TokenCostTable({ inputTokens, outputTokens }: Props) {
  const show = (amount: number) => (inputTokens === null ? "…" : formatUsd(amount));
  const withReply = outputTokens !== undefined;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-2xl border border-edge-subtle">
        <table className="w-full text-ui-subhead">
          <thead className="text-ui-footnote text-fg-muted">
            <tr className="border-b border-edge-subtle">
              <th scope="col" className="px-3 py-2 text-left font-medium">Model</th>
              {withReply ? (
                <>
                  <th scope="col" className={`${CELL} font-medium`}>Input</th>
                  <th scope="col" className={`${CELL} font-medium`}>Reply</th>
                  <th scope="col" className={`${CELL} font-medium`}>Total</th>
                </>
              ) : (
                <th scope="col" className={`${CELL} font-medium`}>Cost</th>
              )}
            </tr>
          </thead>
          <tbody>
            {MODEL_PRICES.map((model) => {
              const cost = modelCost(model, inputTokens ?? 0, outputTokens ?? 0);
              return (
                <tr key={model.id} className="border-b border-edge-subtle last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="font-semibold">{model.name}</span>
                    {!isExactCount(model) && <span className="text-fg-muted" title="Estimated: this model uses its own tokenizer"> ≈</span>}
                    <span className="block text-ui-caption text-fg-muted">
                      {withReply ? `${formatUsd(model.input)} / ${formatUsd(model.output)}` : formatUsd(model.input)} per 1M
                    </span>
                  </th>
                  {withReply && <td className={CELL}>{show(cost.input)}</td>}
                  {withReply && <td className={CELL}>{show(cost.output)}</td>}
                  <td className={`${CELL} font-semibold`}>{show(cost.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-ui-caption text-fg-muted">
        {withReply ? "Input / output prices" : "Input prices"} per million tokens as of {PRICES_AS_OF},
        standard tier, without batch or cache discounts. Counts use the o200k tokenizer: exact for
        OpenAI models, an estimate (≈) for the others. Check the provider&apos;s pricing page before
        you budget.
      </p>
    </div>
  );
}
