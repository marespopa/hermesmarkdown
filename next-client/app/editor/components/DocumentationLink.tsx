"use client";

import React from "react";
import { HiOutlineBookOpen } from "react-icons/hi";
import TextLink from "@/app/components/TextLink";
import Tooltip from "@/app/components/Tooltip";
import CornerButton from "./CornerButton";

// Documentation entry point of the page bars: a CornerButton, as every
// button of the top-right row, unless `compact`.
export default function DocumentationLink({ compact = false }: { compact?: boolean }) {
  if (!compact) return <CornerButton icon={<HiOutlineBookOpen size={14} aria-hidden="true" />} label="Documentation" href="/documentation" />;
  return (
    <Tooltip label="Documentation" position="bottom" portal>
      <TextLink
        href="/documentation"
        variant="unstyled"
        aria-label="Documentation"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-fill hover:text-fg"
      >
        <HiOutlineBookOpen size={18} aria-hidden="true" />
      </TextLink>
    </Tooltip>
  );
}
