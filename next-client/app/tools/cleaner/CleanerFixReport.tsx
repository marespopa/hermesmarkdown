import { fixLabel, type FixId } from "./cleaner-fixes";
import { FORMAT_LABELS, type InputFormat } from "./convert-input";

interface Props {
  format: InputFormat;
  fixes: { id: FixId; count: number }[];
}

// What the Markdown Cleaner did: the conversion, if any, then one chip per
// fix rule with its count, or "Already clean".
export default function CleanerFixReport({ format, fixes }: Props) {
  const total = fixes.reduce((sum, fix) => sum + fix.count, 0);
  const converted = format !== "markdown";
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-ui-footnote text-fg-muted">
        {converted && <>Converted from {FORMAT_LABELS[format]}. </>}
        {total ? `${total.toLocaleString("en-US")} ${total === 1 ? "fix" : "fixes"}` : converted ? "" : "Already clean."}
      </p>
      {total > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Fixes">
          {fixes.map(({ id, count }) => (
            <li key={id} className="px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.07] text-ui-caption text-fg-muted">
              {fixLabel(id, count)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
