"use client";

import dynamic from "next/dynamic";
import { TokenizerSkeleton } from "../components/ToolSkeletons";

// Client-only, since the text lives in sessionStorage; its skeleton
// outlines the tool so the page doesn't jump when it mounts.
const TokenizerTool = dynamic(() => import("./TokenizerTool"), {
  ssr: false,
  loading: () => <TokenizerSkeleton />,
});

export default function TokenizerToolLoader() {
  return <TokenizerTool />;
}
