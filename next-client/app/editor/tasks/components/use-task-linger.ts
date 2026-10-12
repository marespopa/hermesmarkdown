"use client";

import React from "react";
import type { TaskItem } from "@/app/utils/taskExtractor";
import type { TaskStatus } from "@/app/utils/task-status";

// After a status change on the Tasks page, the list holds still for a beat
// before tasks move: the changed row stays where it was showing its new
// status (the ring fills, the text strikes through), then the list settles
// into its new grouping. Each further change restarts the beat, so ticking
// off several tasks in a row never reshuffles them under the pointer.
// While holding, rows still take each task's latest data by id, so its
// ring, stamps and writeback stay current. `layoutKey` names what's on
// screen (list, grouping, sort, search): when it changes, the hold lets go
// at once, so switching lists never shows the old one.

export const LINGER_MS = 1200;

export interface LingerGroup<T extends TaskItem> {
  tasks: T[];
}

export function useTaskLinger<T extends TaskItem, G extends LingerGroup<T>>(
  groups: G[],
  tasks: T[],
  layoutKey: string,
  delay = LINGER_MS,
) {
  const [snapshot, setSnapshot] = React.useState<{ key: string; groups: G[] } | null>(null);
  const frozen = snapshot?.key === layoutKey ? snapshot.groups : null;
  // The new status per task id, shown until the rescan catches up.
  const [pending, setPending] = React.useState<Record<string, TaskStatus>>({});
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const hold = React.useCallback(
    (task: T, status: TaskStatus) => {
      setSnapshot((current) => (current?.key === layoutKey ? current : { key: layoutKey, groups }));
      setPending((current) => ({ ...current, [task.id]: status }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setSnapshot(null);
        setPending({});
      }, delay);
    },
    [groups, layoutKey, delay],
  );

  const shown = React.useMemo(() => {
    if (!frozen) return groups;
    const latest = new Map(tasks.map((t) => [t.id, t]));
    return frozen.map((group) => ({
      ...group,
      tasks: group.tasks.map((t) => {
        const current = latest.get(t.id) ?? t;
        const status = pending[t.id];
        return status && current.status !== status ? { ...current, status, checked: status === "done" } : current;
      }),
    }));
  }, [frozen, groups, tasks, pending]);

  return { groups: shown, hold, lingering: frozen !== null };
}
