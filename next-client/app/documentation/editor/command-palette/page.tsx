"use client";

import { DocPageLayout, DocKeyValueTable } from "@/app/documentation/components/DocPageLayout";

export default function CommandPalettePage() {
  return (
    <DocPageLayout
      cluster="Editor"
      clusterHref="/documentation"
      title="Command Palette"
      summary="A fuzzy-searchable list of every app-level action — open it instead of hunting for a menu."
      related={[
        { href: "/documentation/get-started/keyboard-shortcuts", label: "Keyboard shortcuts" },
        { href: "/documentation/ai-features/ai-commands", label: "AI commands" },
        { href: "/documentation/editor/writing", label: "Writing" },
      ]}
    >
      <div>
        <h2>Opening it</h2>
        <p>
          <code>CTRL+SHIFT+P</code>. Keep typing to filter — matching characters are highlighted,
          and each entry shows its own shortcut if it has one.
        </p>
        [screenshot — command palette open]
      </div>

      <div>
        <h2>What's in it</h2>
        <p>
          Every command here is a second entry point to something also reachable another way —
          there's no command-only behavior.
        </p>
        <DocKeyValueTable
          rows={[
            { label: "Save", value: "CTRL+S" },
            { label: "New file", value: "—" },
            { label: "Export current file", value: "—" },
            { label: "Toggle sidebar", value: "CTRL+SHIFT+E" },
            { label: "Switch theme", value: "—" },
            { label: "Open settings", value: "—" },
            { label: "Open vault", value: "—" },
            { label: "New folder", value: "When a vault is open" },
            { label: "Document info", value: "CTRL+SHIFT+I" },
            { label: "Open AI Builder", value: "CTRL+SHIFT+B · when AI is configured" },
            { label: "Focus editor", value: "—" },
            { label: "Close current tab", value: "—" },
            { label: "Close all tabs", value: "—" },
          ]}
        />
      </div>

      <div>
        <h2>Driving the app without a mouse</h2>
        <p>
          Combine this with the per-context shortcuts in{" "}
          <a href="/documentation/get-started/keyboard-shortcuts" className="text-sage font-semibold hover:underline">
            Keyboard shortcuts
          </a>{" "}
          and the slash command menu (<code>/</code>) for inserting content, and the editor is
          fully operable without ever reaching for the mouse.
        </p>
      </div>
    </DocPageLayout>
  );
}
