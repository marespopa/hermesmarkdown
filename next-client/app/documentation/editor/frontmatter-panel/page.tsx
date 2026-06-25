"use client";

import { DocPageLayout, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function FrontmatterPanelPage() {
  return (
    <DocPageLayout
      cluster="Editor"
      clusterHref="/documentation"
      title="Frontmatter panel"
      summary="A structured form over the YAML block at the top of a file — edit fields without writing YAML by hand."
      related={[
        { href: "/documentation/vault/frontmatter-conventions", label: "Frontmatter conventions" },
        { href: "/documentation/get-started/create-your-first-note", label: "Create your first note" },
        { href: "/documentation/vault/hermes-architecture", label: ".hermes/ architecture" },
      ]}
    >
      <div>
        <h2>Opening it</h2>
        <p>
          Click the ✎ icon in a document's frontmatter header to open the panel. It also opens
          automatically as the wizard on new files.
        </p>
        [screenshot — frontmatter panel open]
      </div>

      <div>
        <h2>Supported fields</h2>
        <p>
          The panel renders whatever fields your vault's schema defines — by default{" "}
          <code>title</code>, <code>status</code>, <code>scope</code>, <code>read_when</code>,{" "}
          <code>related</code>, <code>tags</code>, and <code>edit_elsewhere</code>. Field types
          (text, list, enum) come from <code>.hermes/schema.yaml</code>, so a custom schema changes
          what the panel shows.
        </p>
      </div>

      <div>
        <h2>How edits sync to source</h2>
        <p>
          Every change in the panel writes straight back to the YAML block at the top of the file
          — there's no separate save step for frontmatter and no risk of the panel and the raw
          block drifting apart.
        </p>
      </div>

      <DocCallout type="note">
        On a mobile screen, the panel uses the same bottom-sheet layout as the table dialog, to
        stay clear of the soft keyboard.
      </DocCallout>
    </DocPageLayout>
  );
}
