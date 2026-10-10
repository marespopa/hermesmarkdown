import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import TableToolLoader from "../table/TableToolLoader";
import TableOpenButton from "../table/TableOpenButton";

const tool = toolBySlug("markdown-table-generator");

export const metadata = toolMetadata(tool);

export default function MarkdownTableGeneratorPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<TableOpenButton variant="outlined" />}>
      <TableToolLoader />
    </ToolShell>
  );
}
