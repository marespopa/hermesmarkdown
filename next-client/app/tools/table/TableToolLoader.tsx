"use client";

import dynamic from "next/dynamic";
import { TableSkeleton } from "../components/ToolSkeletons";

// Client-only: the grid is a CodeMirror view and the table lives in
// sessionStorage. Its skeleton outlines the tool so the page doesn't
// jump when it mounts; CodeMirror loads only on this route.
const TableTool = dynamic(() => import("./TableTool"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});

export default function TableToolLoader() {
  return <TableTool />;
}
