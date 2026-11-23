import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import WordToMarkdownToolLoader from "./WordToMarkdownToolLoader";
import CleanerOpenButton from "../cleaner/CleanerOpenButton";

const tool = toolBySlug("word-to-markdown");

export const metadata = toolMetadata(tool);

export default function WordToMarkdownPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<CleanerOpenButton variant="outlined" blankStart />}>
      <WordToMarkdownToolLoader />
    </ToolShell>
  );
}
