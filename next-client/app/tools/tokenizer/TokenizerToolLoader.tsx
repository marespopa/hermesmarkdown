"use client";

import dynamic from "next/dynamic";

// Client-only, since the text lives in sessionStorage; the skeleton holds
// the tool's height so the page doesn't jump when it mounts.
const TokenizerTool = dynamic(() => import("./TokenizerTool"), {
  ssr: false,
  loading: () => <div className="h-[560px] rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />,
});

export default function TokenizerToolLoader() {
  return <TokenizerTool />;
}
