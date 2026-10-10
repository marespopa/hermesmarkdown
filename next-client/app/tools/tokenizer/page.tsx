import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import TokenizerToolLoader from "./TokenizerToolLoader";
import TokenizerOpenButton from "./TokenizerOpenButton";

const tool = toolBySlug("tokenizer");

export const metadata = toolMetadata(tool);

export default function TokenizerPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<TokenizerOpenButton variant="outlined" />}>
      <TokenizerToolLoader />
    </ToolShell>
  );
}
