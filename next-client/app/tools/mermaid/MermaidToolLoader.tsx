"use client";

import dynamic from "next/dynamic";

// Client-only, since the source lives in sessionStorage; the skeleton holds
// the tool's height. `mermaid` itself loads on the first render.
const MermaidTool = dynamic(() => import("./MermaidTool"), {
  ssr: false,
  loading: () => <div className="h-[600px] rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />,
});

export default function MermaidToolLoader() {
  return <MermaidTool />;
}
