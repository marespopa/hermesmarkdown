"use client";

import { DocPageLayout, DocCode, DocKeyValueTable, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function FrontmatterConventionsPage() {
  return (
    <DocPageLayout
      cluster="Vault"
      clusterHref="/documentation"
      title="Frontmatter conventions"
      summary="The default schema's fields, their types, and what each is for — all optional except title."
      related={[
        { href: "/documentation/vault/hermes-architecture", label: ".hermes/ architecture" },
        { href: "/documentation/vault/agent-context-protocol", label: "Agent context protocol" },
        { href: "/documentation/editor/frontmatter-panel", label: "Frontmatter panel" },
      ]}
    >
      <div>
        <h2>Default fields</h2>
        <DocKeyValueTable
          rows={[
            { label: "title", value: "string · required" },
            { label: "status", value: "enum · default draft" },
            { label: "scope", value: "string · optional" },
            { label: "read_when", value: "list · optional" },
            { label: "related", value: "list · optional" },
            { label: "tags", value: "list · optional" },
            { label: "edit_elsewhere", value: "list · optional" },
          ]}
        />
      </div>

      <div>
        <h2>title</h2>
        <p>The note's primary identifier. The only field a note can't be saved without.</p>
      </div>

      <div>
        <h2>status</h2>
        <p>
          One of <code>draft</code>, <code>review</code>, <code>active</code>, or{" "}
          <code>archived</code>. Stays in sync with the document's lifecycle tag — change one and
          the other follows.
        </p>
      </div>

      <div>
        <h2>scope</h2>
        <p>
          A one-line summary written for an agent, not a human. This is what gets loaded at Tier 1
          of the agent context protocol, before any agent opens the full file.
        </p>
        <DocCode>{`scope: "Pricing decisions for the Q3 launch, not engineering details"`}</DocCode>
      </div>

      <div>
        <h2>read_when</h2>
        <p>Controls whether an agent loads this file at all. Accepts:</p>
        <DocKeyValueTable
          rows={[
            { label: "A plain sentence", value: "Matched semantically" },
            { label: '"keywords: a, b, c"', value: "Matched by keyword" },
            { label: '"always"', value: "Always loaded" },
            { label: '"never"', value: "Always skipped" },
          ]}
        />
      </div>

      <div>
        <h2>related</h2>
        <p>
          Wikilinks to other notes worth checking alongside this one — <code>[[Note Name]]</code>{" "}
          entries that an agent can follow without re-deriving the relationship from content.
        </p>
      </div>

      <div>
        <h2>tags</h2>
        <p>Free-form domain tags, distinct from the lifecycle tag that mirrors <code>status</code>.</p>
      </div>

      <div>
        <h2>edit_elsewhere</h2>
        <p>
          External locations this note's content is duplicated to or sourced from — a flag so an
          agent doesn't treat this file as the single source of truth.
        </p>
      </div>

      <DocCallout type="tip">
        None of this is fixed. The schema in <code>.hermes/schema.yaml</code> is editable from
        Settings → Schema — drop fields you don't use, rename them, or add your own.
      </DocCallout>
    </DocPageLayout>
  );
}
