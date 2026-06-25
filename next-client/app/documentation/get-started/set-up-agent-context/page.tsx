"use client";

import { DocPageLayout, DocKeyValueTable, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function SetUpAgentContextPage() {
  return (
    <DocPageLayout
      cluster="Get started"
      clusterHref="/documentation"
      title="Set up agent context"
      summary="The .hermes/ folder is what lets a coding agent skim your vault instead of reading every file in full."
      related={[
        { href: "/documentation/vault/hermes-architecture", label: ".hermes/ architecture" },
        { href: "/documentation/vault/agent-context-protocol", label: "Agent context protocol" },
        { href: "/documentation/vault/frontmatter-conventions", label: "Frontmatter conventions" },
      ]}
    >
      <div>
        <h2>What it is</h2>
        <p>
          <code>.hermes/</code> is a hidden folder created the first time you open a vault. It
          holds a schema, an agent-facing reference doc, and a frontmatter template — nothing that
          touches your notes' content.
        </p>
      </div>

      <div>
        <h2>What it's for</h2>
        <p>
          An agent pointed at your vault reads <code>.hermes/AGENTS.md</code> first. From there it
          knows the frontmatter schema and can build an index of every file's <code>scope</code>{" "}
          and <code>read_when</code> field without opening the files themselves. That's the basis
          of the three-tier read protocol described in{" "}
          <a href="/documentation/vault/agent-context-protocol" className="text-sage font-semibold hover:underline">
            Agent context protocol
          </a>
          .
        </p>
      </div>

      <DocKeyValueTable
        rows={[
          { label: "Where it's set up", value: "Settings → Guide" },
          { label: "Action", value: "Check & Install" },
          { label: "Re-run anytime", value: "Safe — won't overwrite your notes" },
        ]}
      />

      <DocCallout type="note">
        Skipping this step doesn't break anything. Your vault still works, and you can still write
        frontmatter by hand — an agent just has to read full files instead of scope summaries.
      </DocCallout>
    </DocPageLayout>
  );
}
