"use client";

import React, { type ComponentProps, type ReactNode } from "react";
import Button from "@/app/components/Button";
import TextLink from "@/app/components/TextLink";
import Tooltip from "@/app/components/Tooltip";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

type Props = Omit<ComponentProps<typeof Button>, "variant" | "children" | "label"> & {
  icon: ReactNode;
  /** The accessible name, and the tooltip unless `tooltip` is given. */
  label: string;
  tooltip?: string;
  shortcut?: string;
  /** A link instead of a button: the same square, leading to this address. */
  href?: string;
};

// The link's own rounding and focus ring give way to the pill's.
const LINK_CLASS = `${PILL_BUTTON_CLASS} !rounded-lg focus-visible:!ring-1 focus-visible:!ring-offset-0`;

// One button of the window's top-right row, on the editor (EditorShell) and in
// the pages' title bars (ShellPage): a 32px rounded square with a faint tint,
// an icon and a tooltip below it (PILL_BUTTON_CLASS). Every button in those
// rows is this component, so they can't drift apart. With `href` it is a link
// that looks the same.
export default function CornerButton({ icon, label, tooltip, shortcut, href, className = "", ...rest }: Props) {
  return (
    <Tooltip label={tooltip ?? label} shortcut={shortcut} position="bottom" portal>
      {href ? (
        <TextLink href={href} variant="unstyled" aria-label={label} className={`${LINK_CLASS} ${className}`}>
          {icon}
        </TextLink>
      ) : (
        <Button variant="unstyled" aria-label={label} className={`${PILL_BUTTON_CLASS} ${className}`} {...rest}>
          {icon}
        </Button>
      )}
    </Tooltip>
  );
}
