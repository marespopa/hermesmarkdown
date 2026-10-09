import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import MarkdownCleanerToolLoader from "../cleaner/MarkdownCleanerToolLoader";
import CleanerOpenButton from "../cleaner/CleanerOpenButton";

const tool = toolBySlug("markdown-cleaner");

export const metadata = toolMetadata(tool);

export default function MarkdownCleanerPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<CleanerOpenButton variant="outlined" />}>
      <MarkdownCleanerToolLoader />
    </ToolShell>
  );
}
