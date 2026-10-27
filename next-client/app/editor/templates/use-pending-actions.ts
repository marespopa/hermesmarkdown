"use client";

import { useCallback, useRef, useState } from "react";

// One action at a time per scope (a pack, a template, the wizard): `run`
// ignores a second click while the scope is busy, even before the disabled
// state has rendered, and `pendingAction(scope)` names the action under way,
// so its button can spin and the scope's other buttons wait.
export function usePendingActions() {
  const [pending, setPending] = useState<ReadonlyMap<string, string>>(new Map());
  const running = useRef(new Set<string>());

  const run = useCallback(async (scope: string, action: string, work: () => Promise<unknown>) => {
    if (running.current.has(scope)) return;
    running.current.add(scope);
    setPending((previous) => new Map(previous).set(scope, action));
    try {
      await work();
    } finally {
      running.current.delete(scope);
      setPending((previous) => {
        const next = new Map(previous);
        next.delete(scope);
        return next;
      });
    }
  }, []);

  const pendingAction = useCallback((scope: string) => pending.get(scope), [pending]);

  return { run, pendingAction };
}
