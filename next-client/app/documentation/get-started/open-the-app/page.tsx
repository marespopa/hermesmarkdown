"use client";

import { DocPageLayout, DocCallout, DocKeyValueTable } from "@/app/documentation/components/DocPageLayout";

export default function OpenTheAppPage() {
  return (
    <DocPageLayout
      cluster="Get started"
      clusterHref="/documentation"
      title="Open the app"
      summary="HermesMarkdown is a web app. There's nothing to download or install — open it in a supported browser."
      related={[
        { href: "/documentation/get-started/create-a-vault", label: "Create a vault" },
        { href: "/documentation/ai-features/privacy-model", label: "Privacy model" },
      ]}
    >
      <div>
        <p>
          Vaults are read and written through the browser's File System Access API, which only
          Chromium-based browsers implement. Use one of the browsers below.
        </p>
        <DocKeyValueTable
          rows={[
            { label: "Google Chrome", value: "Supported" },
            { label: "Microsoft Edge", value: "Supported" },
            { label: "Brave / Arc / Opera", value: "Supported" },
            { label: "Firefox", value: "Not supported" },
            { label: "Safari", value: "Not supported" },
          ]}
        />
      </div>

      <DocCallout type="note">
        On an unsupported browser, the editor still loads, but the vault picker is disabled —
        there's no folder to open or save to.
      </DocCallout>

      <div>
        <h2>Optional: install as a PWA</h2>
        <p>
          HermesMarkdown ships a web app manifest, so supported browsers offer an "Install" option
          in the address bar. Installing gives it its own window and app icon, but doesn't change
          how it works — it's the same browser-based app, not a native build.
        </p>
      </div>
    </DocPageLayout>
  );
}
