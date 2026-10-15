"use client";

import dynamic from "next/dynamic";
import { TokenCostSkeleton } from "../components/ToolSkeletons";

// Client-only, since the text lives in sessionStorage; its skeleton
// outlines the tool so the page doesn't jump when it mounts.
const TokenCostTool = dynamic(() => import("./TokenCostTool"), {
  ssr: false,
  loading: () => <TokenCostSkeleton />,
});

export default function TokenCostToolLoader() {
  return <TokenCostTool />;
}
