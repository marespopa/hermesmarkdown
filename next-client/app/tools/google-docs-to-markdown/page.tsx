import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import GoogleDocsToMarkdownToolLoader from "./GoogleDocsToMarkdownToolLoader";
import CleanerOpenButton from "../cleaner/CleanerOpenButton";

const tool = toolBySlug("google-docs-to-markdown");

export const metadata = toolMetadata(tool);

export default function GoogleDocsToMarkdownPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<CleanerOpenButton variant="outlined" blankStart />}>
      <GoogleDocsToMarkdownToolLoader />
    </ToolShell>
  );
}
