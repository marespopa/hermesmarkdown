"use client";

import React from "react";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi";
import TextLink from "@/app/components/TextLink";
import Tooltip from "@/app/components/Tooltip";

export interface PageHelp {
  /** The page's section of the documentation, e.g. `/documentation#tasks-page`. */
  href: string;
  /** What the section explains, for the tooltip ("How to use Tasks"). */
  label: string;
}

// A small (?) at the top right of an /editor page (ShellPage's title bar):
// a link to that page's section of the documentation, with what it explains
// as its tooltip.
export default function PageHelpLink({ href, label }: PageHelp) {
  return (
    <Tooltip label={label} position="bottom" portal>
      <TextLink
        href={href}
        variant="unstyled"
        aria-label={`Help: ${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-fill hover:text-fg [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
      >
        <HiOutlineQuestionMarkCircle size={18} aria-hidden />
      </TextLink>
    </Tooltip>
  );
}
