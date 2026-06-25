"use client";

import { DocPageLayout, DocCode, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function HermesArchitecturePage() {
  return (
    <DocPageLayout
      cluster="Vault"
      clusterHref="/documentation"
      title=".hermes/ architecture"
      summary="Four files, generated into a hidden folder, that let an agent understand your vault without opening every note."
      related={[
        { href: "/documentation/vault/agent-context-protocol", label: "Agent context protocol" },
        { href: "/documentation/vault/frontmatter-conventions", label: "Frontmatter conventions" },
        { href: "/documentation/get-started/set-up-agent-context", label: "Set up agent context" },
      ]}
    >
      <div>
        <h2>schema.yaml</h2>
        <p>
          The frontmatter schema for this vault — which fields exist, their types, and their
          defaults. Edit it from Settings → Schema; every new note's frontmatter wizard reads from
          it.
        </p>
      </div>

      <div>
        <h2>AGENTS.md</h2>
        <p>
          An agent-facing reference: the current schema (with a hash so an agent can detect drift),
          field-by-field documentation, and a tree of the vault's structure. This is the file an
          agent is expected to read first.
        </p>
      </div>

      <div>
        <h2>template.md</h2>
        <p>
          A frontmatter block pre-filled with this schema's default values, used when creating new
          files programmatically.
        </p>
      </div>

      <div>
        <h2>index.yaml</h2>
        <p>
          Built on demand, not stored permanently — a flat list of every file in the vault with
          just its frontmatter: path, title, status, scope, read_when, related, tags. No file
          body content.
        </p>
        <DocCode>{`generated: 2026-06-25T10:03:00Z
files:
  - path: projects/roadmap.md
    title: Roadmap
    status: active
    scope: "Q3 priorities and current blockers"
    read_when: "keywords: roadmap, priorities, planning"
    tags: [project]`}</DocCode>
      </div>

      <DocCallout type="note">
        <code>index.yaml</code> carries a <code>generated</code> timestamp. An agent that finds it
        more than five minutes old should treat it as possibly stale and regenerate before relying
        on it.
      </DocCallout>
    </DocPageLayout>
  );
}
