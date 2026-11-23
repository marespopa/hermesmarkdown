"use client";

import dynamic from "next/dynamic";
import { CleanerSkeleton } from "../components/ToolSkeletons";

// The Markdown Cleaner preset for Google Docs text: client-only like the Cleaner
// (sessionStorage input, DOM-based HTML conversion), with its skeleton.
const MarkdownCleanerTool = dynamic(() => import("../cleaner/MarkdownCleanerTool"), {
  ssr: false,
  loading: () => <CleanerSkeleton />,
});

const HINT =
  "In your Google Doc press Ctrl/Cmd+A and Ctrl/Cmd+C, then paste into the box. No Google sign-in is needed.";

export default function GoogleDocsToMarkdownToolLoader() {
  return <MarkdownCleanerTool initialMode="html" hint={HINT} />;
}
