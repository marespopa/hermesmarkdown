"use client";

import dynamic from "next/dynamic";

// Client-only: the grid is a CodeMirror view and the table lives in
// sessionStorage. The skeleton holds the tool's height so the page doesn't
// jump when it mounts; CodeMirror loads only on this route.
const TableTool = dynamic(() => import("./TableTool"), {
  ssr: false,
  loading: () => <div className="h-[520px] rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />,
});

export default function TableToolLoader() {
  return <TableTool />;
}
