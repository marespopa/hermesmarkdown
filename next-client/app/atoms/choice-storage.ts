import { atom, type SetStateAction } from "jotai";
import { atomWithStorage } from "jotai/utils";

// `value` when it is one of `choices`, otherwise `fallback`.
export function normalizeChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? (value as T) : fallback;
}

// A setting persisted in localStorage that takes one of a fixed set of
// values. A stored value that isn't one of them (say, an option an older
// version offered) reads as `fallback`, and is replaced on the next write.
export function atomWithChoiceStorage<T extends string>(key: string, choices: readonly T[], fallback: T) {
  const stored = atomWithStorage<string>(key, fallback);
  return atom(
    (get): T => normalizeChoice(get(stored), choices, fallback),
    (get, set, next: SetStateAction<T>) => {
      const current = normalizeChoice(get(stored), choices, fallback);
      set(stored, typeof next === "function" ? next(current) : next);
    },
  );
}
