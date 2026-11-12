"use client";

import React from "react";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi";
import TextLink from "@/app/components/TextLink";
import Tooltip from "@/app/components/Tooltip";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

export interface PageHelp {
  /** The page's section of the documentation, e.g. `/documentation#tasks-page`. */
  href: string;
  /** What the section explains, for the tooltip ("How to use Tasks"). */
  label: string;
}

// A small (?) at the top right of an /editor page (ShellPage's title bar):
// a link to that page's section of the documentation, with what it explains
// as its tooltip. In the corner buttons' look (PILL_BUTTON_CLASS), as the
// editor's top-right row.
export default function PageHelpLink({ href, label }: PageHelp) {
  return (
    <Tooltip label={label} position="bottom" portal>
      <TextLink
        href={href}
        variant="unstyled"
        aria-label={`Help: ${label}`}
        className={PILL_BUTTON_CLASS}
      >
        <HiOutlineQuestionMarkCircle size={14} aria-hidden />
      </TextLink>
    </Tooltip>
  );
}
