import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_aiEnabled, atom_aiProvider, atom_aiWebSearchEnabled, atom_claudeKey, atom_isAiConfigured, atom_ollamaBaseUrl, atom_selectedAiModel, atom_ollamaKey, atom_webMcpEnabled, atom_webMcpWritesEnabled } from "@/app/atoms/ui-atoms";
import AiSettings from "./AiSettings";

vi.mock("@/app/services/ai", () => ({
  fetchClaudeModels: vi.fn().mockResolvedValue([{ id: "sonnet-5", name: "Claude Sonnet 5" }]),
  fetchGeminiModels: vi.fn().mockResolvedValue([]),
  fetchOllamaModels: vi.fn().mockResolvedValue([]),
  isLocalBaseUrl: (url: string) => /localhost|127\.0\.0\.1/.test(url),
  testAIConnection: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/app/components/Toastr", () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

function renderWith(setup: (store: ReturnType<typeof createStore>) => void = () => {}) {
  const store = createStore();
  setup(store);
  render(
    <Provider store={store}>
      <AiSettings />
    </Provider>,
  );
  return store;
}

describe("AiSettings", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("starts off, with only the switch shown", () => {
    const store = renderWith();
    expect(screen.getByRole("switch", { name: "AI features" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText("API key")).not.toBeInTheDocument();
    expect(store.get(atom_aiEnabled)).toBe(false);
  });

  it("shows the setup once turned on, and the key actions once a key is entered", () => {
    const store = renderWith();
    fireEvent.click(screen.getByRole("switch", { name: "AI features" }));

    expect(store.get(atom_aiEnabled)).toBe(true);
    expect(screen.getByText("API key")).toBeInTheDocument();
    expect(screen.queryByText("Remove key")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("sk-ant-..."), { target: { value: "sk-ant-test" } });
    expect(store.get(atom_isAiConfigured)).toBe(true);
    expect(screen.getByText("Test connection")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Remove key"));
    expect(store.get(atom_claudeKey)).toBe("");
  });

  it("offers Auto first in the model select, on by default, and returns to it on a provider switch", async () => {
    const store = renderWith((s) => {
      s.set(atom_aiEnabled, true);
      s.set(atom_claudeKey, "sk-ant-test");
    });
    const select = screen.getByRole("combobox", { name: "Model" });
    expect(select).not.toBeDisabled();
    expect((select as HTMLSelectElement).options[0]).toHaveTextContent("Auto (picks by task)");
    expect(store.get(atom_selectedAiModel)).toBe("auto");

    await screen.findByRole("option", { name: "Claude Sonnet 5" });
    fireEvent.change(select, { target: { value: "sonnet-5" } });
    expect(store.get(atom_selectedAiModel)).toBe("sonnet-5");
    fireEvent.click(screen.getByRole("button", { name: "Gemini" }));
    expect(store.get(atom_selectedAiModel)).toBe("auto");
  });

  it("sets up Ollama with a base URL and no key, and resets the URL", async () => {
    const store = renderWith((s) => {
      s.set(atom_aiEnabled, true);
      s.set(atom_aiProvider, "ollama");
    });

    expect(store.get(atom_isAiConfigured)).toBe(true);
    expect(screen.getByText("API key (optional)")).toBeInTheDocument();
    expect(await screen.findByText("No models found. Pull a model first (ollama pull <model>), then refresh.")).toBeInTheDocument();
    expect(screen.queryByText("Remove key")).not.toBeInTheDocument();
    expect(screen.queryByText("Reset URL")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("https://ollama.com"), { target: { value: "https://ollama.example.com" } });
    expect(store.get(atom_ollamaBaseUrl)).toBe("https://ollama.example.com");

    fireEvent.change(screen.getByPlaceholderText("Optional"), { target: { value: "ollama-key" } });
    expect(store.get(atom_ollamaKey)).toBe("ollama-key");

    fireEvent.click(screen.getByText("Reset URL"));
    expect(store.get(atom_ollamaBaseUrl)).toBe("https://ollama.com");

    fireEvent.click(screen.getByText("Remove key"));
    expect(store.get(atom_ollamaKey)).toBe("");
  });

  it("explains the local-instance CORS setting for a local Ollama URL", () => {
    renderWith((s) => {
      s.set(atom_aiEnabled, true);
      s.set(atom_aiProvider, "ollama");
      s.set(atom_ollamaBaseUrl, "http://localhost:11434");
    });
    expect(screen.getByText(/OLLAMA_ORIGINS/)).toBeInTheDocument();
  });

  it("turning it off keeps the key but disables AI", () => {
    const store = renderWith((s) => {
      s.set(atom_aiEnabled, true);
      s.set(atom_claudeKey, "sk-ant-test");
    });
    fireEvent.click(screen.getByRole("switch", { name: "AI features" }));

    expect(store.get(atom_isAiConfigured)).toBe(false);
    expect(store.get(atom_claudeKey)).toBe("sk-ant-test");
    expect(screen.queryByText("API key")).not.toBeInTheDocument();
  });

  it("keeps Browser agents off by default and separate from AI features", () => {
    const store = renderWith();
    const browserAgents = screen.getByRole("switch", { name: "Let browser agents read files" });
    expect(browserAgents).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/doesn't offer them yet/)).toBeInTheDocument();

    fireEvent.click(browserAgents);

    expect(store.get(atom_webMcpEnabled)).toBe(true);
    expect(store.get(atom_aiEnabled)).toBe(false);
  });

  it("lets Claude search the web once turned on, off by default, and not for Gemini", () => {
    const store = renderWith((s) => s.set(atom_aiEnabled, true));
    const webSearch = screen.getByRole("switch", { name: "Let the companion search the web" });
    expect(webSearch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(webSearch);
    expect(store.get(atom_aiWebSearchEnabled)).toBe(true);

    act(() => store.set(atom_aiProvider, "gemini"));
    expect(screen.queryByRole("switch", { name: "Let the companion search the web" })).toBeNull();
  });

  it("offers letting browser agents change notes only once they may read, off by default", () => {
    const store = renderWith();
    expect(screen.queryByRole("switch", { name: "Let browser agents change files" })).toBeNull();

    fireEvent.click(screen.getByRole("switch", { name: "Let browser agents read files" }));
    const writes = screen.getByRole("switch", { name: "Let browser agents change files" });
    expect(writes).toHaveAttribute("aria-checked", "false");

    fireEvent.click(writes);
    expect(store.get(atom_webMcpWritesEnabled)).toBe(true);
  });

  it("reads as on for a key saved before the switch existed", () => {
    const store = renderWith((s) => s.set(atom_claudeKey, "sk-ant-test"));
    expect(store.get(atom_aiEnabled)).toBe(true);
    expect(screen.getByRole("switch", { name: "AI features" })).toHaveAttribute("aria-checked", "true");
  });
});
