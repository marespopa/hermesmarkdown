"use client";

import React from "react";
import Button from "@/app/components/Button";
import TabContextMenu, { type TabContextMenuItem } from "@/app/editor/components/TabContextMenu";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/app/utils/task-status";

// The ring drawn for each status: empty (to do), half-filled (in progress),
// pause bars (on hold), filled with a check (done), dashed (cancelled).
export function TaskStatusIcon({ status, size = 16 }: { status: TaskStatus; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" className="shrink-0">
      {status === "todo" && <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--fg-faint)" strokeWidth="1.5" />}
      {status === "prog" && (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--task-prog)" strokeWidth="1.5" />
          <path d="M8 3.75 A4.25 4.25 0 0 1 8 12.25 Z" fill="var(--task-prog)" />
        </>
      )}
      {status === "hold" && (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--task-hold)" strokeWidth="1.5" />
          <path d="M6.5 5.75v4.5M9.5 5.75v4.5" stroke="var(--task-hold)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {status === "done" && (
        <>
          <circle cx="8" cy="8" r="7" fill="var(--task-done)" />
          <path d="M5 8.25l2 2 4-4.25" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "cancelled" && (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--fg-faint)" strokeWidth="1.5" strokeDasharray="2.2 2" />
          <path d="M5.5 8h5" stroke="var(--fg-faint)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const MENU_ORDER: TaskStatus[] = ["todo", "prog", "hold", "done", "cancelled"];

export function taskStatusMenuItems(current: TaskStatus, onSetStatus: (status: TaskStatus) => void): TabContextMenuItem[] {
  return MENU_ORDER.map((status) => ({
    label: TASK_STATUS_LABEL[status],
    icon: <TaskStatusIcon status={status} size={14} />,
    checked: status === current,
    divider: status === "cancelled",
    onClick: () => onSetStatus(status),
  }));
}

// A task's status control. A click completes an open task or reopens a
// closed one; right-click (a long press on touch) opens the menu of every
// status. `menuAt` lets the row open the same menu from its own button
// (`menuAnchorRef`, so pressing that button again closes it).
export default function TaskStatusButton({
  status,
  onToggle,
  onSetStatus,
  menuAt,
  menuAnchorRef,
  onMenuClose,
}: {
  status: TaskStatus;
  onToggle: () => void;
  onSetStatus: (status: TaskStatus) => void;
  menuAt?: { x: number; y: number } | null;
  menuAnchorRef?: React.RefObject<HTMLElement | null>;
  onMenuClose?: () => void;
}) {
  const [ownMenu, setOwnMenu] = React.useState<{ x: number; y: number } | null>(null);
  const menu = menuAt ?? ownMenu;
  const closeMenu = React.useCallback(() => {
    setOwnMenu(null);
    onMenuClose?.();
  }, [onMenuClose]);

  return (
    <>
      <Button
        variant="unstyled"
        role="checkbox"
        aria-checked={status === "done" ? true : status === "prog" ? "mixed" : false}
        aria-label={`${TASK_STATUS_LABEL[status]}. Click to ${status === "done" || status === "cancelled" ? "reopen" : "complete"}, right-click for more`}
        title={TASK_STATUS_LABEL[status]}
        onClick={onToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setOwnMenu({ x: e.clientX, y: e.clientY });
        }}
        className="relative -m-1.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-150 active:scale-90 [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9"
      >
        <TaskStatusIcon status={status} />
      </Button>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          label="Task status"
          anchorRef={menuAt ? menuAnchorRef : undefined}
          items={taskStatusMenuItems(status, onSetStatus)}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
