"use client";

import React from "react";
import { HiOutlineBookOpen } from "react-icons/hi";
import TextLink from "@/app/components/TextLink";
import Tooltip from "@/app/components/Tooltip";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

// Documentation entry point of the page bars, in the corner buttons' look
// (PILL_BUTTON_CLASS) unless `compact`.
export default function DocumentationLink({ compact = false }: { compact?: boolean }) {
  return (
    <Tooltip label="Documentation" position="bottom" portal>
      <TextLink
        href="/documentation"
        variant="unstyled"
        aria-label="Documentation"
        className={compact ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-fill hover:text-fg" : PILL_BUTTON_CLASS}
      >
        <HiOutlineBookOpen size={compact ? 18 : 14} aria-hidden="true" />
      </TextLink>
    </Tooltip>
  );
}
