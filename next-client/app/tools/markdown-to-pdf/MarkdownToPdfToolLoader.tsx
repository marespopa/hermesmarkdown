"use client";

import dynamic from "next/dynamic";
import { PdfSkeleton } from "../components/ToolSkeletons";

// Client-only: the input lives in sessionStorage and the printout is built
// in the browser. Its skeleton outlines the tool.
const MarkdownToPdfTool = dynamic(() => import("../pdf/MarkdownToPdfTool"), {
  ssr: false,
  loading: () => <PdfSkeleton />,
});

export default function MarkdownToPdfToolLoader() {
  return <MarkdownToPdfTool />;
}
