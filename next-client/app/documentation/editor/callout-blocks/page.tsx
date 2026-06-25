"use client";

import { DocPageLayout, DocCode, DocKeyValueTable, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function CalloutBlocksPage() {
  return (
    <DocPageLayout
      cluster="Editor"
      clusterHref="/documentation"
      title="Callout blocks"
      summary="Obsidian-compatible callout syntax — a typed, foldable blockquote, written in plain Markdown."
      related={[
        { href: "/documentation/editor/writing", label: "Writing" },
        { href: "/documentation/get-started/keyboard-shortcuts", label: "Keyboard shortcuts" },
      ]}
    >
      <div>
        <h2>Syntax</h2>
        <DocCode>{`> [!tip] Optional title
> Body text, same as a regular blockquote.`}</DocCode>
        <p>
          Insert one from the slash menu with <code>/callout</code>, which defaults to{" "}
          <code>note</code>.
        </p>
      </div>

      <div>
        <h2>Collapsing</h2>
        <p>
          Add <code>+</code> or <code>-</code> after the type to make it foldable: <code>+</code>{" "}
          starts expanded, <code>-</code> starts collapsed. No suffix means a plain, non-foldable
          callout.
        </p>
        <DocCode>{`> [!warning]- Collapsed by default
> Click the title to expand.`}</DocCode>
      </div>

      <div>
        <h2>Types</h2>
        <p>The type is case-insensitive and any word works, but these have dedicated colors and icons:</p>
        <DocKeyValueTable
          rows={[
            { label: "note", value: "📝" },
            { label: "abstract", value: "📋" },
            { label: "info", value: "ℹ️" },
            { label: "tip", value: "💡" },
            { label: "success", value: "✅" },
            { label: "question", value: "❓" },
            { label: "warning", value: "⚠️" },
            { label: "failure", value: "❌" },
            { label: "danger", value: "🔥" },
            { label: "bug", value: "🐛" },
            { label: "example", value: "📑" },
            { label: "quote", value: "💬" },
          ]}
        />
      </div>

      <DocCallout type="note">
        Aliases resolve to one of the types above — e.g. <code>tldr</code> and <code>summary</code>{" "}
        map to <code>abstract</code>; <code>caution</code> and <code>attention</code> map to{" "}
        <code>warning</code>; <code>error</code> maps to <code>danger</code>. An unrecognized type
        falls back to the <code>note</code> style with your own label.
      </DocCallout>
    </DocPageLayout>
  );
}
