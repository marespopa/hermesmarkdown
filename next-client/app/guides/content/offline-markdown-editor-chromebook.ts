import type { GuideEntry } from "./types";

export const OFFLINE_MARKDOWN_EDITOR_CHROMEBOOK: GuideEntry = {
  slug: "offline-markdown-editor-chromebook",
  title: "An Offline Markdown Editor for Chromebook and Tablets | HermesMarkdown",
  description:
    "Install HermesMarkdown as an app on a Chromebook, tablet or phone and write Markdown without a connection. Notes are saved to a folder or a browser vault.",
  lead: "Install the editor once, then write Markdown with no connection, on a Chromebook, an iPad or a phone.",
  keywords: [
    "offline markdown editor chromebook",
    "markdown editor chromebook",
    "offline markdown editor",
    "markdown editor ipad offline",
    "markdown pwa",
    "markdown editor no internet",
  ],
  section: "Offline",
  sections: [
    {
      heading: "How it works offline",
      body: [
        "HermesMarkdown is a web app. After it has loaded once online, it can start without a network connection, and everything except the AI features keeps working. Your files are never sent anywhere unless you use them.",
      ],
    },
    {
      heading: "Install it as an app",
      body: [
        "In Chrome or Edge, use Install in the address bar; the app opens in its own window. On an iPhone or iPad, use Share, then Add to Home Screen. In Safari on a Mac, use Add to Dock.",
        "Load the app once while you are online and open the editor, so everything it needs is stored for later.",
      ],
    },
    {
      heading: "Where your notes live",
      body: [
        "In Chrome and Edge you can save to a folder on the device, which keeps the files as plain .md files that other apps can open. In Safari, Firefox and on iPhone and iPad, notes live in a browser vault inside the browser's own storage.",
        "A browser vault exists only in that browser. Clearing site data deletes it, and iOS may clear a website's data when it hasn't been used for a while. Installing to the home screen helps protect it, and exporting the vault as a zip keeps a backup.",
      ],
    },
    {
      heading: "A few good habits",
      body: [
        "Export a zip of a browser vault from time to time. Keep the app installed if you rely on it offline. For anything that needs AI, plan to be online: those requests need a connection to the provider you chose.",
      ],
    },
  ],
  docs: ["installation", "browser-vaults", "vaults-on-mobile", "create-a-vault", "mobile-layout"],
  faq: [
    {
      q: "Does it work on a Chromebook?",
      a: "Yes. Chrome on a Chromebook is a Chromium browser, so you can install the app and save to a folder on the device, or use a browser vault.",
    },
    {
      q: "Will my notes survive without internet?",
      a: "Yes. They are stored on your device, in a folder or in the browser's storage, and nothing depends on a server.",
    },
    {
      q: "Can I use it on an iPad?",
      a: "Yes. Add it to the Home Screen and it opens full screen and starts without a connection. Notes are kept in a browser vault; export a zip for a backup.",
    },
    {
      q: "Which features need a connection?",
      a: "Only the optional AI features. A local Ollama model on your own network is the exception, since it doesn't need the internet.",
    },
    {
      q: "How do I get my notes onto another device?",
      a: "Export the vault as a zip and import it elsewhere, or keep a folder in a location your own sync tool handles. HermesMarkdown has no sync service of its own.",
    },
  ],
  related: [
    { label: "A free alternative for desktop editors", href: "/alternatives/typora-free-alternative" },
    { label: "A private online editor, offline", href: "/alternatives/dillinger-alternative" },
    { label: "Markdown to PDF", href: "/tools/markdown-to-pdf" },
  ],
};
