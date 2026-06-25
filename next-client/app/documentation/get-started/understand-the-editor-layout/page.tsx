"use client";

import { DocPageLayout, DocKeyValueTable } from "@/app/documentation/components/DocPageLayout";

export default function UnderstandTheEditorLayoutPage() {
  return (
    <DocPageLayout
      cluster="Get started"
      clusterHref="/documentation"
      title="Understand the editor layout"
      summary="The app opens straight into a full-screen editor — every panel is summoned, not docked by default."
      related={[
        { href: "/documentation/editor/command-palette", label: "Command Palette" },
        { href: "/documentation/editor/writing", label: "Writing" },
        { href: "/documentation/get-started/keyboard-shortcuts", label: "Keyboard shortcuts" },
      ]}
    >
      <div>
        <h2>No persistent toolbar</h2>
        <p>
          There's no formatting toolbar above the text. Formatting happens through Markdown
          syntax, keyboard shortcuts, and the slash command menu.
        </p>
        [screenshot — full-screen editor, no chrome]
      </div>

      <div>
        <h2>The icon rail and sidebar</h2>
        <p>
          A thin icon rail sits at the left edge. Hover it to peek at the sidebar (files, search,
          smart workspaces); pin it open with <code>CTRL+SHIFT+E</code> when you need it visible
          while you work.
        </p>
      </div>

      <div>
        <h2>Panels you open on demand</h2>
        <DocKeyValueTable
          rows={[
            { label: "Sidebar", value: "Hover edge / CTRL+SHIFT+E" },
            { label: "Command Palette", value: "CTRL+SHIFT+P" },
            { label: "Document Info", value: "CTRL+SHIFT+I" },
            { label: "AI Builder", value: "CTRL+SHIFT+B" },
            { label: "Frontmatter panel", value: "✎ in document header" },
          ]}
        />
      </div>

      <div>
        <h2>Multiple panes</h2>
        <p>
          Open several files side by side: split right from the tab bar, drag tabs between panes,
          and resize with the divider.
        </p>
      </div>
    </DocPageLayout>
  );
}
