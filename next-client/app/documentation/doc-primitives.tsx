import type { ReactNode } from "react";

// Building blocks shared by the documentation page and its content modules.

export function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="p-5 bg-neutral-900 dark:bg-black/40 text-neutral-100 selection:bg-white/25 selection:text-white rounded-2xl overflow-x-auto font-mono text-sm leading-relaxed w-full min-w-0">
      <code>{children}</code>
    </pre>
  );
}

export function Callout({ type = "note", children }: { type?: "note" | "warning" | "tip"; children: ReactNode }) {
  const labels = { note: "Note", warning: "Warning", tip: "Tip" };
  return (
    <div className="pl-5 py-1 border-l-2 border-black/10 dark:border-white/15 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
      <span className="block text-ui-footnote uppercase tracking-[0.2em] font-bold mb-2 opacity-50">{labels[type]}</span>
      {children}
    </div>
  );
}

export function KV({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <div className="p-5 sm:p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap justify-between border-b border-black/5 dark:border-white/5 py-3 sm:py-4 last:border-none items-baseline gap-x-4 gap-y-1">
          <span className="text-sm font-medium min-w-0 shrink break-words">{r.label}</span>
          <span className="opacity-40 italic text-right text-ui-footnote uppercase tracking-wider font-bold shrink-0 max-w-full break-words">{r.value}</span>
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
          <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">{g.context}</h3>
          <KV rows={g.rows.map((r) => ({ label: r.label, value: r.shortcut }))} />
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
  items: Subsection[];
};
