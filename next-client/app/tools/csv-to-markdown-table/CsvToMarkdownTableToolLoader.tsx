"use client";

import dynamic from "next/dynamic";
import { TableSkeleton } from "../components/ToolSkeletons";

// The table generator with its CSV import open: client-only like the
// generator (CodeMirror grid, sessionStorage), with its skeleton.
const TableTool = dynamic(() => import("../table/TableTool"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});

export default function CsvToMarkdownTableToolLoader() {
  return <TableTool csvImportOpen />;
}
