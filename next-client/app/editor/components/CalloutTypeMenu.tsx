"use client";

import React from "react";
import { CALLOUT_META } from "../constants/callouts";
import TabContextMenu from "./TabContextMenu";

interface CalloutTypeMenuProps {
  x: number;
  y: number;
  /** The callout's current type, checked in the list. */
  current: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

const TYPES = Object.keys(CALLOUT_META);

// The callout types, each with its icon and color, in the shared menu look;
// opened from a callout's title label or right after inserting one.
export default function CalloutTypeMenu({ x, y, current, onSelect, onClose }: CalloutTypeMenuProps) {
  return (
    <TabContextMenu
      x={x}
      y={y}
      label="Callout type"
      onClose={onClose}
      items={TYPES.map((type) => {
        const { Icon, text } = CALLOUT_META[type];
        return {
          label: type[0].toUpperCase() + type.slice(1),
          icon: <Icon size={14} className={`shrink-0 ${text}`} aria-hidden />,
          checked: type === current,
          onClick: () => onSelect(type),
        };
      })}
    />
  );
}
