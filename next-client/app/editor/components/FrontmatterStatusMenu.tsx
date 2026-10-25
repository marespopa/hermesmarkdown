"use client";

import React from "react";
import { FRONTMATTER_STATUSES } from "./constants";
import TabContextMenu from "./TabContextMenu";

interface FrontmatterStatusMenuProps {
  x: number;
  y: number;
  /** The note's current `status` value, checked in the list. */
  current: string;
  onSelect: (status: string) => void;
  onClose: () => void;
}

const TASK_STATES = 3;

// The known statuses (todo, in-progress, done | draft, review, active,
// archived) in the shared menu look; opened from the frontmatter header's
// status chip. A current value outside the list comes first.
export default function FrontmatterStatusMenu({ x, y, current, onSelect, onClose }: FrontmatterStatusMenuProps) {
  const unknown = current !== "" && !FRONTMATTER_STATUSES.includes(current);
  const values = unknown ? [current, ...FRONTMATTER_STATUSES] : FRONTMATTER_STATUSES;
  const dividerBefore = (index: number) => (unknown ? index === 1 || index === 1 + TASK_STATES : index === TASK_STATES);
  return (
    <TabContextMenu
      x={x}
      y={y}
      label="Status"
      onClose={onClose}
      items={values.map((status, index) => ({
        label: status,
        checked: status === current,
        divider: dividerBefore(index),
        onClick: () => onSelect(status),
      }))}
    />
  );
}
