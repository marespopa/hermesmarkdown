"use client";

import { DocPageLayout, DocCode, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function AgentContextProtocolPage() {
  return (
    <DocPageLayout
      cluster="Vault"
      clusterHref="/documentation"
      title="Agent context protocol"
      summary="Three tiers — skip, scope-only, full load — let an agent traverse a large vault without reading every file."
      related={[
        { href: "/documentation/vault/hermes-architecture", label: ".hermes/ architecture" },
        { href: "/documentation/vault/frontmatter-conventions", label: "Frontmatter conventions" },
        { href: "/documentation/get-started/set-up-agent-context", label: "Set up agent context" },
      ]}
    >
      <div>
        <h2>Step 1 — filter by read_when</h2>
        <p>
          An agent starts at <code>.hermes/index.yaml</code>, not the vault's files. For each
          entry, it checks <code>read_when</code>: an empty value, an unmatched query context, or
          an explicit <code>"never"</code> means the file is skipped entirely — Tier 0.
        </p>
      </div>

      <div>
        <h2>Step 2 — load scope only</h2>
        <p>
          For files that pass the filter, the agent reads only the <code>scope</code> field from
          the index — Tier 1. If that one-line summary is enough to answer the task at hand, the
          agent stops there without opening the file.
        </p>
      </div>

      <div>
        <h2>Step 3 — load full content</h2>
        <p>
          Only when <code>scope</code> is missing or insufficient does the agent open the file in
          full — Tier 2. This is the expensive path, reserved for files the earlier tiers couldn't
          resolve.
        </p>
      </div>

      <div>
        <h2>How to write for it</h2>
        <p>
          Write <code>scope</code> as if an agent will never read past it. Use{" "}
          <code>read_when</code> to rule files out explicitly — a stale meeting note marked{" "}
          <code>read_when: never</code> never costs a Tier 2 load, no matter how it's named or
          where it sits in the vault.
        </p>
        <DocCode>{`---
title: Q2 Retro
status: archived
scope: "Closed-out retro notes, superseded by Q3 planning"
read_when: never
---`}</DocCode>
      </div>

      <DocCallout type="note">
        This protocol is what <code>.hermes/index.yaml</code> exists to serve. Without it, an
        agent has no shortcut and falls back to reading files directly.
      </DocCallout>
    </DocPageLayout>
  );
}
