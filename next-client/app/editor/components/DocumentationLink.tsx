"use client";

import React from "react";
import { HiOutlineBookOpen } from "react-icons/hi";
import TextLink from "@/app/components/TextLink";
import Tooltip from "@/app/components/Tooltip";

// Documentation entry point shared by the editor, page bars, and sidebar.
export default function DocumentationLink({ compact = false }: { compact?: boolean }) {
  return (
    <Tooltip label="Documentation" position="bottom" portal>
      <TextLink
        href="/documentation"
        variant="unstyled"
        aria-label="Documentation"
        className={`flex shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-fill hover:text-fg ${
          compact ? "h-7 w-7 rounded-full" : "h-8 w-8 rounded-lg"
        }`}
      >
        <HiOutlineBookOpen size={18} aria-hidden="true" />
      </TextLink>
    </Tooltip>
  );
}
