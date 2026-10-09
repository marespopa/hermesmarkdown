import Link from "next/link";
import { toolPath, type ToolEntry } from "../content/tools";

// One tool on the /tools hub.
export default function ToolCard({ tool }: { tool: ToolEntry }) {
  return (
    <Link
      href={toolPath(tool)}
      className="block p-6 rounded-2xl border border-edge-subtle bg-surface-raised hover:border-sage transition-colors"
    >
      <h2 className="font-bold text-lg">{tool.name}</h2>
      <p className="mt-2 text-ui-subhead text-fg-muted leading-relaxed">{tool.lead}</p>
    </Link>
  );
}
