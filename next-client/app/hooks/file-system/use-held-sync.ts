"use client";

import { useCallback } from "react";
import { holdVaultSync } from "./vault-sync-hold";

// `fn`, holding the background vault sync while it runs (vault-sync-hold.ts).
// Keeps `fn`'s identity rules: a new function only when `fn` changes.
export function useHeldSync<F extends (...args: any[]) => Promise<any>>(fn: F): F {
  return useCallback((...args: Parameters<F>) => holdVaultSync(() => fn(...args)), [fn]) as F;
}
