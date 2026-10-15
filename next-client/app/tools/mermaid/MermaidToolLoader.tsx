"use client";

import dynamic from "next/dynamic";
import { MermaidSkeleton } from "../components/ToolSkeletons";

// Client-only, since the source lives in sessionStorage; its skeleton
// outlines the tool. `mermaid` itself loads on the first render.
const MermaidTool = dynamic(() => import("./MermaidTool"), {
  ssr: false,
  loading: () => <MermaidSkeleton />,
});

export default function MermaidToolLoader() {
  return <MermaidTool />;
}
