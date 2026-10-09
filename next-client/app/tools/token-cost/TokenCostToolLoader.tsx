"use client";

import dynamic from "next/dynamic";

// Client-only, since the text lives in sessionStorage; the skeleton holds
// the tool's height so the page doesn't jump when it mounts.
const TokenCostTool = dynamic(() => import("./TokenCostTool"), {
  ssr: false,
  loading: () => <div className="h-[900px] rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />,
});

export default function TokenCostToolLoader() {
  return <TokenCostTool />;
}
