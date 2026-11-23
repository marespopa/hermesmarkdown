"use client";

import dynamic from "next/dynamic";
import { CleanerSkeleton } from "../components/ToolSkeletons";

// The Markdown Cleaner preset for Word text: client-only like the Cleaner
// (sessionStorage input, DOM-based HTML conversion), with its skeleton.
const MarkdownCleanerTool = dynamic(() => import("../cleaner/MarkdownCleanerTool"), {
  ssr: false,
  loading: () => <CleanerSkeleton />,
});

const HINT =
  "Copy your text in Word, then paste it into the box. Headings, lists, links and tables convert as you paste.";

export default function WordToMarkdownToolLoader() {
  return <MarkdownCleanerTool initialMode="html" hint={HINT} />;
}
