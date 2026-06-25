"use client";

import { DocPageLayout, DocCode, DocKeyValueTable } from "@/app/documentation/components/DocPageLayout";

export default function VaultOverviewPage() {
  return (
    <DocPageLayout
      cluster="Vault"
      clusterHref="/documentation"
      title="Vault overview"
      summary="A vault is a folder. HermesMarkdown adds one hidden directory to it and otherwise leaves your files alone."
      related={[
        { href: "/documentation/vault/hermes-architecture", label: ".hermes/ architecture" },
        { href: "/documentation/get-started/create-a-vault", label: "Create a vault" },
        { href: "/documentation/vault/frontmatter-conventions", label: "Frontmatter conventions" },
      ]}
    >
      <div>
        <h2>Directory structure</h2>
        <p>
          Any folder you open becomes a vault. Subfolders, file names, and organization are
          entirely yours — HermesMarkdown doesn't enforce a structure or move files around.
        </p>
        <DocCode>{`my-vault/
  .hermes/          ← created by HermesMarkdown
    schema.yaml
    AGENTS.md
    template.md
  projects/         ← yours
    roadmap.md
  daily/            ← yours
    2026-06-25.md`}</DocCode>
      </div>

      <div>
        <h2>What HermesMarkdown creates vs. what you create</h2>
        <DocKeyValueTable
          rows={[
            { label: ".hermes/schema.yaml", value: "Generated" },
            { label: ".hermes/AGENTS.md", value: "Generated" },
            { label: ".hermes/template.md", value: "Generated" },
            { label: ".hermes/index.yaml", value: "Generated on demand" },
            { label: "Everything else", value: "Yours" },
          ]}
        />
      </div>

      <div>
        <h2>Plain files, no lock-in</h2>
        <p>
          Every note is a plain <code>.md</code> file with YAML frontmatter. Open the folder in
          any other editor, sync it with Dropbox or Google Drive, or move it to another machine —
          nothing about it depends on HermesMarkdown being installed.
        </p>
      </div>
    </DocPageLayout>
  );
}
