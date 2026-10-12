import { StateEffect, StateField } from "@codemirror/state";
import type { RollupKind } from "@/app/utils/rollup/period";

// What the editor knows about the rollup sheet it shows, set from React
// (useRollupEditorContext): its path and level (for item actions and the
// level colour), the marker caption ("From your daily sheets · updated
// 2 min ago") and the item lines the last rebuild added (tinted briefly).
// Null for every other note.
export interface RollupContext {
  path: string;
  kind: RollupKind;
  caption: string;
  fresh: ReadonlySet<string>;
}

export const setRollupContext = StateEffect.define<RollupContext | null>();

export const rollupContextField = StateField.define<RollupContext | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setRollupContext)) value = effect.value;
    return value;
  },
});

export const hasRollupContextEffect = (transactions: readonly { effects: readonly StateEffect<unknown>[] }[]) =>
  transactions.some((tr) => tr.effects.some((effect) => effect.is(setRollupContext)));
