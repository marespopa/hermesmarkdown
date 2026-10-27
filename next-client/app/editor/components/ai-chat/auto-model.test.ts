import { describe, expect, it } from "vitest";
import { FALLBACK_CLAUDE_MODELS, FALLBACK_GEMINI_MODELS } from "./chat-helpers";
import { modelSize, pickTier, resolveAutoModel, type AutoSignals } from "./auto-model";

const base: AutoSignals = { prompt: "hello", contextChars: 0, hasAttachments: false, retries: 0 };

describe("pickTier", () => {
  it("sends a short plain prompt to fast", () => {
    expect(pickTier({ ...base, prompt: "what is this note about" })).toBe("fast");
  });
  it("sends an easy task to fast", () => {
    expect(pickTier({ ...base, prompt: "fix this typo", contextChars: 9000 })).toBe("fast");
    expect(pickTier({ ...base, prompt: "fix this typo" })).toBe("fast");
  });
  it("sends a long prompt or large context to balanced", () => {
    expect(pickTier({ ...base, prompt: "a".repeat(700) })).toBe("balanced");
    expect(pickTier({ ...base, contextChars: 9000 })).toBe("balanced");
    expect(pickTier({ ...base, hasAttachments: true })).toBe("balanced");
  });
  it("sends hard intent to deep when it adds up", () => {
    expect(pickTier({ ...base, prompt: "restructure these notes" })).toBe("balanced");
    expect(pickTier({ ...base, prompt: "restructure these notes", contextChars: 9000 })).toBe("deep");
    expect(pickTier({ ...base, prompt: "```js\nx\n``` analyze and compare", hasAttachments: true })).toBe("deep");
  });
  it("escalates on each retry", () => {
    expect(pickTier({ ...base, retries: 1 })).toBe("balanced");
    expect(pickTier({ ...base, retries: 3 })).toBe("deep");
  });
  it("lets a fixed tier win", () => {
    expect(pickTier({ ...base, prompt: "restructure everything", retries: 5, fixedTier: "fast" })).toBe("fast");
  });
});

describe("resolveAutoModel", () => {
  it("maps Claude and Gemini tiers", () => {
    expect(resolveAutoModel("claude", "fast", [])).toBe("haiku-4-5");
    expect(resolveAutoModel("claude", "balanced", [])).toBe("sonnet-5");
    expect(resolveAutoModel("claude", "deep", [])).toBe("opus-4-8");
    expect(resolveAutoModel("gemini", "fast", [])).toBe("gemini-3.1-flash-lite");
    expect(resolveAutoModel("gemini", "deep", [])).toBe("gemini-3.1-pro");
  });
  it("uses ids the fallback lists know", () => {
    const claude = FALLBACK_CLAUDE_MODELS.map((m) => m.id);
    const gemini = FALLBACK_GEMINI_MODELS.map((m) => m.id);
    for (const tier of ["fast", "balanced", "deep"] as const) {
      expect(claude).toContain(resolveAutoModel("claude", tier, []));
      expect(gemini).toContain(resolveAutoModel("gemini", tier, []));
    }
  });
  it("steps to the nearest tier the live list has", () => {
    const live = [{ id: "sonnet-5" }];
    expect(resolveAutoModel("claude", "deep", live)).toBe("sonnet-5");
    expect(resolveAutoModel("claude", "fast", live)).toBe("sonnet-5");
  });
  it("orders Ollama models by size", () => {
    const models = [{ id: "qwen3:32b" }, { id: "llama3:8b" }, { id: "gemma3:12b" }];
    expect(resolveAutoModel("ollama", "fast", models)).toBe("llama3:8b");
    expect(resolveAutoModel("ollama", "balanced", models)).toBe("gemma3:12b");
    expect(resolveAutoModel("ollama", "deep", models)).toBe("qwen3:32b");
  });
  it("keeps list order for unsized Ollama ids, after sized ones", () => {
    const models = [{ id: "mistral" }, { id: "phi:3b" }, { id: "zephyr" }];
    expect(resolveAutoModel("ollama", "fast", models)).toBe("phi:3b");
    expect(resolveAutoModel("ollama", "deep", models)).toBe("zephyr");
  });
  it("uses the only Ollama model for every tier, and none for none", () => {
    expect(resolveAutoModel("ollama", "deep", [{ id: "llama3:8b" }])).toBe("llama3:8b");
    expect(resolveAutoModel("ollama", "fast", [])).toBe("");
  });
});

describe("modelSize", () => {
  it("reads billions and millions", () => {
    expect(modelSize("llama3:8b")).toBe(8);
    expect(modelSize("qwen3:0.6b")).toBe(0.6);
    expect(modelSize("tiny:500m")).toBe(0.5);
    expect(modelSize("mistral")).toBeNull();
  });
});
