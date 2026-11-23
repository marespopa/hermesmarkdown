import { toolBySlug, toolMetadata } from "../content/tools";
import ToolShell from "../components/ToolShell";
import MarkdownToPdfToolLoader from "./MarkdownToPdfToolLoader";
import PdfOpenButton from "../pdf/PdfOpenButton";

const tool = toolBySlug("markdown-to-pdf");

export const metadata = toolMetadata(tool);

export default function MarkdownToPdfPage() {
  return (
    <ToolShell tool={tool} openInWorkspace={<PdfOpenButton variant="outlined" />}>
      <MarkdownToPdfToolLoader />
    </ToolShell>
  );
}
