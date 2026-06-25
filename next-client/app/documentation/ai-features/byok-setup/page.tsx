"use client";

import { DocPageLayout, DocKeyValueTable, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function ByokSetupPage() {
  return (
    <DocPageLayout
      cluster="AI features"
      clusterHref="/documentation"
      title="BYOK setup"
      summary="Every AI feature is hidden until you connect your own Anthropic or Google Gemini key — there's no default model HermesMarkdown provides."
      related={[
        { href: "/documentation/ai-features/ai-commands", label: "AI commands" },
        { href: "/documentation/ai-features/privacy-model", label: "Privacy model" },
      ]}
    >
      <div>
        <h2>Supported providers</h2>
        <DocKeyValueTable
          rows={[
            { label: "Anthropic Claude", value: "Sonnet, Haiku, Opus tiers" },
            { label: "Google Gemini", value: "Models fetched from your account" },
          ]}
        />
      </div>

      <div>
        <h2>Connect a key</h2>
        <p>
          Settings → AI Features → choose a provider → paste your API key → Test Connection. Once
          a key validates, every AI action in the editor and command palette becomes visible.
        </p>
        [screenshot — AI settings, key field]
      </div>

      <div>
        <h2>Where the key lives</h2>
        <p>
          The key is written to your browser's local storage and read from there on every AI
          request. It is never transmitted to a HermesMarkdown server — there isn't one in this
          path.
        </p>
      </div>

      <DocCallout type="note">
        Remove a key by clearing the field in Settings → AI Features and saving. AI actions
        disappear again until a new key is set.
      </DocCallout>
    </DocPageLayout>
  );
}
