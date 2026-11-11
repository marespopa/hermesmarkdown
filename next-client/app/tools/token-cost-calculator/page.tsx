import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import TokenCostToolLoader from "../token-cost/TokenCostToolLoader";
import TokenCostOpenButton from "../token-cost/TokenCostOpenButton";

const tool = toolBySlug("token-cost-calculator");

export const metadata = toolMetadata(tool);

export default function TokenCostCalculatorPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<TokenCostOpenButton variant="outlined" />}>
      <TokenCostToolLoader />
    </ToolShell>
  );
}
