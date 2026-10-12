"use client";

import React from "react";
import { HiOutlineCalendar } from "react-icons/hi";
import Button from "@/app/components/Button";

interface ToolApprovalCardProps {
  lines: string[];
  onApprove: () => void;
  onDecline: () => void;
}

// The add_to_today tool's question: the lines the AI wants to add to today's
// sheet, as they'll be written, with Add / Don't add. Nothing is written
// until Add is clicked.
export default function ToolApprovalCard({ lines, onApprove, onDecline }: ToolApprovalCardProps) {
  return (
    <div role="group" aria-label="Add to today's sheet?" className="ml-8 rounded-xl border border-sage/25 bg-sage/5 dark:bg-sage/10 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-ui-caption font-semibold text-sage mb-1.5">
        <HiOutlineCalendar size={13} aria-hidden="true" />
        Add to today&apos;s sheet?
      </p>
      <pre className="text-ui-caption font-mono whitespace-pre-wrap leading-relaxed text-ink-light dark:text-ink-dark mb-2.5">{lines.join("\n")}</pre>
      <div className="flex items-center gap-1.5">
        <Button variant="unstyled" onClick={onApprove} className="px-2.5 py-1 rounded-lg text-ui-caption font-medium bg-sage text-white hover:bg-sage/85 transition-colors">
          Add {lines.length === 1 ? "line" : `${lines.length} lines`}
        </Button>
        <Button variant="unstyled" onClick={onDecline} className="px-2.5 py-1 rounded-lg text-ui-caption font-medium text-fg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          Don&apos;t add
        </Button>
      </div>
    </div>
  );
}
