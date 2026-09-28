"use client";

// Explorer list-view columns beside the name: Date Modified and Kind. Shown
// from `sm` (Date Modified) and `md` (Kind) up; the name column takes the rest.

const DATE_COLUMN = "hidden sm:block w-44 shrink-0 truncate";
const KIND_COLUMN = "hidden md:block w-32 shrink-0 truncate";

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Today at 14:32", "Yesterday at 09:10", else "12 Sep 2026 at 14:32".
export function formatModified(ms: number | undefined, now = new Date()): string {
  if (!ms) return "--";
  const date = new Date(ms);
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return `Today at ${time}`;
  if (sameDay(date, yesterday)) return `Yesterday at ${time}`;
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${day} at ${time}`;
}

const KINDS: Record<string, string> = {
  md: "Markdown",
  markdown: "Markdown",
  txt: "Plain Text",
  png: "PNG image",
  jpg: "JPEG image",
  jpeg: "JPEG image",
  gif: "GIF image",
  webp: "WebP image",
  svg: "SVG image",
  pdf: "PDF document",
};

export function kindLabel(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "Document";
  const ext = name.slice(dot + 1).toLowerCase();
  return KINDS[ext] ?? `${ext.toUpperCase()} file`;
}

export function ListColumns({ modified, kind }: { modified: string; kind: string }) {
  return (
    <>
      <span className={`${DATE_COLUMN} text-fg-muted`}>{modified}</span>
      <span className={`${KIND_COLUMN} text-fg-muted`}>{kind}</span>
    </>
  );
}

// Sticky column titles above the rows; the left padding lines "Name" up
// with a top-level row's name (triangle slot + icon).
export function ListHeader() {
  return (
    <div
      role="row"
      className="sticky top-0 z-20 flex h-7 items-center border-b border-edge-subtle bg-chrome pl-4 pr-9 text-ui-caption font-medium text-fg-muted"
    >
      <span className="min-w-0 flex-1 truncate">Name</span>
      <span className={DATE_COLUMN}>Date Modified</span>
      <span className={KIND_COLUMN}>Kind</span>
    </div>
  );
}
