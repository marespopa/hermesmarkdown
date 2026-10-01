"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { HiInformationCircle, HiOutlineInformationCircle } from "react-icons/hi";
import { atom_activeFileHasFrontmatter, atom_frontmatterCollapsedByDefault } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";

interface FrontmatterToggleProps {
  className?: string;
  size?: number;
  /** Show the hover tooltip (desktop only — touch has no hover). */
  withTooltip?: boolean;
}

// Show / hide frontmatter in every file: flips the app-wide, persisted
// "Collapse Frontmatter" setting, which open editors and files opened later
// follow. Rendered only while the active file has frontmatter; filled icon
// while metadata is shown.
export default function FrontmatterToggle({ className, size = 17, withTooltip = true }: FrontmatterToggleProps) {
  const hasFrontmatter = useAtomValue(atom_activeFileHasFrontmatter);
  const [collapsed, setCollapsed] = useAtom(atom_frontmatterCollapsedByDefault);
  if (!hasFrontmatter) return null;

  const label = collapsed ? "Show metadata" : "Hide metadata";
  const Icon = collapsed ? HiOutlineInformationCircle : HiInformationCircle;

  const button = (
    <Button
      variant={withTooltip ? "icon" : "unstyled"}
      onClick={() => setCollapsed(!collapsed)}
      aria-label={label}
      aria-pressed={!collapsed}
      title={withTooltip ? undefined : label}
      className={className}
    >
      <Icon size={size} />
    </Button>
  );
  return withTooltip ? <Tooltip label={label}>{button}</Tooltip> : button;
}
