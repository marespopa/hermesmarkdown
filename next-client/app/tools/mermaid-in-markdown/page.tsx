import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import MermaidToolLoader from "../mermaid/MermaidToolLoader";
import MermaidOpenButton from "../mermaid/MermaidOpenButton";

const tool = toolBySlug("mermaid-in-markdown");

export const metadata = toolMetadata(tool);

export default function MermaidInMarkdownPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<MermaidOpenButton variant="outlined" />}>
      <MermaidToolLoader />
    </ToolShell>
  );
}
