import type { ReactNode } from "react";

// Building blocks shared by the documentation page and its content modules.
// Quiet, rounded surfaces on the page's own tokens: light code panels, notes
// as soft tinted asides, tables as hairline-ruled cards.

export function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="p-5 bg-chrome border border-edge-subtle text-fg rounded-2xl overflow-x-auto font-mono text-[14px] leading-relaxed w-full min-w-0">
      <code>{children}</code>
    </pre>
  );
}

const CALLOUT_STYLES = {
  note: { label: "Note", labelClass: "text-fg" },
  tip: { label: "Tip", labelClass: "text-sage" },
  warning: { label: "Important", labelClass: "text-accent" },
};

export function Callout({ type = "note", children }: { type?: "note" | "warning" | "tip"; children: ReactNode }) {
  const style = CALLOUT_STYLES[type];
  return (
    <aside className="rounded-2xl bg-chrome px-5 py-4 text-[15px] leading-relaxed text-fg-muted">
      <span className={`block text-[15px] font-semibold mb-1 ${style.labelClass}`}>{style.label}</span>
      {children}
    </aside>
  );
}

export function KV({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <div className="rounded-2xl border border-edge-subtle bg-surface-raised px-5">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-6 gap-y-0.5 py-3.5 border-b border-edge-subtle last:border-none"
        >
          <span className="text-[15px] text-fg min-w-0 break-words">{r.label}</span>
          <span className="text-[15px] text-fg-muted sm:text-right min-w-0 break-words">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ShortcutGroups({ groups }: { groups: { context: string; rows: { label: string; shortcut: string }[] }[] }) {
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.context} className="space-y-3">
          <h3 className="text-[17px] font-semibold text-fg">{g.context}</h3>
          <KV
            rows={g.rows.map((r) => ({
              label: r.label,
              value: <kbd className="font-mono text-[13px] text-fg-muted">{r.shortcut}</kbd>,
            }))}
          />
        </div>
      ))}
    </div>
  );
}


export type Subsection = {
  id: string;
  title: string;
  lead: string;
  keywords?: string;
  body: ReactNode;
};

export type Group = {
  id: string;
  label: string;
  /** One line for the group's topic card on the docs home. */
  summary?: string;
  items: Subsection[];
};
