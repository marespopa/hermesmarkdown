"use client";

import dynamic from "next/dynamic";

// Client-only, since the input lives in sessionStorage and HTML conversion
// needs the DOM; the skeleton holds the tool's height.
const MarkdownCleanerTool = dynamic(() => import("./MarkdownCleanerTool"), {
  ssr: false,
  loading: () => <div className="h-[600px] rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />,
});

export default function MarkdownCleanerToolLoader() {
  return <MarkdownCleanerTool />;
}
