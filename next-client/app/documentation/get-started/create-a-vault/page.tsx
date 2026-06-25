"use client";

import { DocPageLayout, DocCode, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function CreateAVaultPage() {
  return (
    <DocPageLayout
      cluster="Get started"
      clusterHref="/documentation"
      title="Create a vault"
      summary="A vault is any folder on disk that HermesMarkdown reads and writes Markdown files in directly — open one to get started."
      related={[
        { href: "/documentation/get-started/set-up-agent-context", label: "Set up agent context" },
        { href: "/documentation/vault/overview", label: "Vault overview" },
        { href: "/documentation/get-started/create-your-first-note", label: "Create your first note" },
      ]}
    >
      <div>
        <h2>Open a vault</h2>
        <p>Click the vault icon in the sidebar and pick an existing folder, or create a new one in the picker.</p>
        [screenshot — vault picker]
        <p>
          The browser grants HermesMarkdown direct read/write access to that folder for the
          session. Nothing is uploaded — files stay where they are on disk.
        </p>
      </div>

      <div>
        <h2>What gets created</h2>
        <p>Opening a folder for the first time adds one hidden directory:</p>
        <DocCode>{`.hermes/
  schema.yaml
  AGENTS.md
  template.md`}</DocCode>
        <p>
          These three files are generated once, on first open, and are explained in{" "}
          <a href="/documentation/vault/hermes-architecture" className="text-sage font-semibold hover:underline">
            .hermes/ architecture
          </a>
          . Everything else in the folder — your notes, your subfolders — is yours; HermesMarkdown
          never restructures it.
        </p>
      </div>

      <DocCallout type="warning">
        Dropbox and iCloud can lock files mid-sync. If saves start failing inside a synced folder,
        pause the sync client and retry.
      </DocCallout>
    </DocPageLayout>
  );
}
