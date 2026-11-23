import type { GuideEntry } from "./types";

export const LOCAL_LLM_OLLAMA_MARKDOWN_EDITOR: GuideEntry = {
  slug: "local-llm-ollama-markdown-editor",
  title: "Use a Local LLM (Ollama) in a Markdown Editor | HermesMarkdown",
  description:
    "Connect HermesMarkdown to a local Ollama model or your own API key to draft and edit notes with AI. AI is off by default, and your notes stay on your device.",
  lead: "Add an AI companion to your notes with a model running on your own machine, or with a key you bring.",
  keywords: [
    "local llm markdown editor",
    "ollama markdown editor",
    "ollama notes app",
    "markdown editor ai local",
    "bring your own key markdown editor",
    "private ai notes",
  ],
  section: "AI",
  sections: [
    {
      heading: "AI is optional",
      body: [
        "AI is off by default. Turn it on in Settings, then choose a provider: Claude, Gemini or Ollama. There is no model that HermesMarkdown provides for you; you bring a key, or a local model.",
      ],
    },
    {
      heading: "Connect Ollama",
      body: [
        "Install Ollama on your computer and pull a model. In HermesMarkdown, open Settings, then AI Features, choose Ollama and enter its base URL. A local instance needs no key; a key is only for Ollama Cloud.",
        "A local Ollama is called straight from your browser, so your text goes to your own machine and not through any HermesMarkdown server. Because the browser makes the request, Ollama must be set to accept requests from this site's address; its documentation covers the allowed-origins setting.",
      ],
    },
    {
      heading: "What the companion can do",
      body: [
        "The companion sits in a panel beside your file. Ask it about your notes, or ask it to draft or change them: it proposes edits and new files for you to review. It reads your files when a vault is open, instead of guessing.",
      ],
    },
    {
      heading: "What leaves your device",
      body: [
        "With a hosted provider, the text you send and your key pass through the HermesMarkdown server for that single request, which forwards them to the provider and stores nothing. The key stays in your browser. With a local Ollama, nothing goes through that server.",
      ],
    },
  ],
  docs: ["byok-setup", "ai-companion", "ai-companion-changes", "ai-chat-tools", "privacy-model"],
  faq: [
    {
      q: "Do I need an account with HermesMarkdown to use AI?",
      a: "No. You need either your own key from a supported provider, or a local Ollama model. Nothing is provided by default.",
    },
    {
      q: "Does a local model keep my notes private?",
      a: "With Ollama running on your own computer, the request goes from your browser to it directly. Check where your Ollama instance runs, since a remote one is not local.",
    },
    {
      q: "Does the AI change my files without asking?",
      a: "It proposes edits and new files for you to review before anything is applied.",
    },
    {
      q: "Does AI work offline?",
      a: "A local Ollama model can, since it needs no internet. A hosted provider needs a connection.",
    },
    {
      q: "Where is my API key stored?",
      a: "In your browser. It is sent with a request so the provider can answer it, and is not stored by HermesMarkdown's servers.",
    },
  ],
  related: [
    { label: "AI Tokenizer", href: "/tools/tokenizer" },
    { label: "Token Cost Calculator", href: "/tools/token-cost-calculator" },
    { label: "Offline Markdown editor", href: "/guides/offline-markdown-editor-chromebook" },
  ],
};
