import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import CsvToMarkdownTableToolLoader from "./CsvToMarkdownTableToolLoader";
import TableOpenButton from "../table/TableOpenButton";

const tool = toolBySlug("csv-to-markdown-table");

export const metadata = toolMetadata(tool);

export default function CsvToMarkdownTablePage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<TableOpenButton variant="outlined" />}>
      <CsvToMarkdownTableToolLoader />
    </ToolShell>
  );
}
