"use client";

import dynamic from "next/dynamic";
import { CleanerSkeleton } from "../components/ToolSkeletons";

// Client-only, since the input lives in sessionStorage and HTML conversion
// needs the DOM; its skeleton outlines the tool.
const MarkdownCleanerTool = dynamic(() => import("./MarkdownCleanerTool"), {
  ssr: false,
  loading: () => <CleanerSkeleton />,
});

export default function MarkdownCleanerToolLoader() {
  return <MarkdownCleanerTool />;
}
