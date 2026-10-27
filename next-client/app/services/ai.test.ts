import { afterEach, describe, expect, it, vi } from "vitest";
import { beautifyAIError, callAI } from "./ai";

describe("beautifyAIError", () => {
  it.each([
    "API key not valid. Please pass a valid API key.",
    "API_KEY_INVALID",
    "invalid x-api-key",
    "401 Unauthorized",
  ])("tells the user to update their key: %s", (raw) => {
    expect(beautifyAIError(raw)).toMatch(/Invalid API Key.*Settings/);
  });
});

describe("beautifyAIError for Ollama", () => {
  it("explains a model outside the plan, keeps Ollama's suggestion and drops the ref", () => {
    const raw = "this model is not included in your free usage, add usage credits to pay as you go: https://ollama.com/settings or upgrade for included usage: https://ollama.com/upgrade. Try gemma4:31b-cloud, which is in the Free plan. (ref: dde41ccf)";
    const message = beautifyAIError(raw);
    expect(message).toMatch(/isn't included in your Ollama plan/);
    expect(message).toContain("Try gemma4:31b-cloud instead");
    expect(message).not.toContain("ref:");
  });
});

describe("callAI errors", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("rejects with the key hint when the proxy reports a bad Gemini key", async () => {
    localStorage.setItem("hermes_ai_provider", "gemini");
    localStorage.setItem("hermes_gemini_key", "k");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "API key not valid. Please pass a valid API key." }),
    }));
    await expect(callAI("s", "hi")).rejects.toThrow(/Settings/);
  });

  it("rejects with a timeout message when the proxy never answers", async () => {
    vi.useFakeTimers();
    localStorage.setItem("hermes_claude_key", "k");
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })));
    const assertion = expect(callAI("s", "hi")).rejects.toThrow(/within 2 minutes/);
    await vi.advanceTimersByTimeAsync(120_001);
    await assertion;
  });

  it("rejects with an AbortError, not an error message, when the caller cancels", async () => {
    localStorage.setItem("hermes_claude_key", "k");
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })));
    const controller = new AbortController();
    const result = callAI("s", "hi", controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
});
