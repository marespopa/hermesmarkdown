"use client";

import { DocPageLayout, DocKeyValueTable, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function WritingPage() {
  return (
    <DocPageLayout
      cluster="Editor"
      clusterHref="/documentation"
      title="Writing"
      summary="One view, not two — the editor highlights Markdown inline over the raw text instead of switching between source and preview."
      related={[
        { href: "/documentation/settings/editor-width", label: "Editor width" },
        { href: "/documentation/editor/command-palette", label: "Command Palette" },
        { href: "/documentation/get-started/keyboard-shortcuts", label: "Keyboard shortcuts" },
      ]}
    >
      <div>
        <h2>No preview mode</h2>
        <p>
          What you see is the file's actual content — headings, bold, links, and lifecycle tags
          are rendered inline over the text you're typing, not in a separate pane. There's nothing
          to toggle between.
        </p>
        [screenshot — inline-highlighted Markdown]
      </div>

      <div>
        <h2>Editor width</h2>
        <p>
          Two column widths are available from Settings → Editor: Standard and Narrow. Below the
          medium breakpoint, the column collapses to full width regardless of the setting.
        </p>
        <DocKeyValueTable
          rows={[
            { label: "Standard", value: "Wider column, more characters per line" },
            { label: "Narrow", value: "Prose-width column" },
            { label: "Small screens", value: "Full width, setting ignored" },
          ]}
        />
      </div>

      <DocCallout type="tip">
        Click actions work without touching raw syntax — checkboxes toggle, lifecycle tags cycle
        on click, and wikilinks open with CTRL+Click.
      </DocCallout>
    </DocPageLayout>
  );
}
