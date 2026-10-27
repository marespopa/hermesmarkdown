import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();
const streamTextMock = vi.fn();
const convertMock = vi.fn();
const createProviderMock = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  streamText: (...args: unknown[]) => streamTextMock(...args),
  convertToModelMessages: (...args: unknown[]) => convertMock(...args),
}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: (options: unknown) => {
    createProviderMock(options);
    return (modelId: string) => ({ modelId });
  },
}));
vi.mock("@/app/api/ai/companion/companion-tools", () => ({
  COMPANION_TOOLS: { search_notes: {} },
  foldSystem: (system: string, messages: unknown[]) => [{ role: "user", content: system }, ...messages],
}));

import { localOllamaText, withLocalOllama } from "./ollama-direct";

const isLocal = (url: string) => url.includes("localhost");

describe("local Ollama", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks a local instance for text, with the system prompt folded in and no key header", async () => {
    generateTextMock.mockResolvedValue({ text: "Short answer" });

    const text = await localOllamaText({ baseUrl: "http://localhost:11434/", modelKey: "llama3.2", system: "Be brief", prompt: "Summarize" });

    expect(text).toBe("Short answer");
    expect(createProviderMock).toHaveBeenCalledWith({ name: "ollama", baseURL: "http://localhost:11434/v1", headers: {} });
    expect(generateTextMock.mock.calls[0][0].prompt).toBe("Be brief\n\n--- TASK ---\n\nSummarize");
  });

  it("reports an empty reply", async () => {
    generateTextMock.mockResolvedValue({ text: "  " });
    await expect(localOllamaText({ baseUrl: "http://localhost:11434", modelKey: "m", system: "", prompt: "x" })).rejects.toThrow(/empty reply/);
  });

  it("answers a local companion request in the browser and sends everything else on", async () => {
    convertMock.mockResolvedValue([{ role: "user", content: "hi" }]);
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse: () => new Response("local stream") });
    const next = vi.fn().mockResolvedValue(new Response("server stream"));
    const fetchLike = withLocalOllama(next as unknown as typeof fetch, isLocal);

    const local = await fetchLike("/api/ai/companion", {
      method: "POST",
      body: JSON.stringify({ provider: "ollama", baseUrl: "http://localhost:11434", modelKey: "llama3.2", system: "Be brief", messages: [] }),
    });
    expect(await local.text()).toBe("local stream");
    expect(next).not.toHaveBeenCalled();
    expect(streamTextMock.mock.calls[0][0].model).toEqual({ modelId: "llama3.2" });

    const cloud = await fetchLike("/api/ai/companion", {
      method: "POST",
      body: JSON.stringify({ provider: "ollama", baseUrl: "https://ollama.com", messages: [] }),
    });
    expect(await cloud.text()).toBe("server stream");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
