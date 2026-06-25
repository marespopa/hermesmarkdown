"use client";

import { DocPageLayout, DocKeyValueTable, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function CreateYourFirstNotePage() {
  return (
    <DocPageLayout
      cluster="Get started"
      clusterHref="/documentation"
      title="Create your first note"
      summary="New File opens a blank Markdown file with a frontmatter wizard ready to fill in."
      related={[
        { href: "/documentation/vault/frontmatter-conventions", label: "Frontmatter conventions" },
        { href: "/documentation/editor/frontmatter-panel", label: "Frontmatter panel" },
        { href: "/documentation/get-started/understand-the-editor-layout", label: "Understand the editor layout" },
      ]}
    >
      <div>
        <h2>Create the file</h2>
        <p>Use the + button in the sidebar, or run New file from the command palette.</p>
        [screenshot — new file + wizard]
      </div>

      <div>
        <h2>The frontmatter wizard</h2>
        <p>
          A wizard opens automatically on every new file, prompting for the fields defined in your
          vault's schema — <code>title</code>, <code>status</code>, and whatever else
          you've configured. Fill in what's relevant and skip the rest; nothing here is required
          beyond <code>title</code>.
        </p>
        <DocKeyValueTable
          rows={[
            { label: "title", value: "Required" },
            { label: "status", value: "Defaults to draft" },
            { label: "Everything else", value: "Optional" },
          ]}
        />
      </div>

      <DocCallout type="tip">
        Closed the wizard without finishing? Click the ✎ icon in the frontmatter header to reopen
        it at any time.
      </DocCallout>

      <div>
        <h2>Save</h2>
        <p>
          Save manually with <code>CTRL+S</code>, or rely on autosave — configurable in{" "}
          <a href="/documentation/settings/editor-width" className="text-sage font-semibold hover:underline">
            Settings → Editor
          </a>
          . The status bar shows whether the file has unsaved changes.
        </p>
      </div>
    </DocPageLayout>
  );
}
