import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_tokenizerEncoding, atom_tokenizerText } from "@/app/atoms/tool-atoms";
import TokenizerTool from "./TokenizerTool";
import { TOKENIZER_EXAMPLES } from "./tokenizer-examples";
import type { TokenizerState } from "./use-tokenizer";

const tokenizer = vi.hoisted(() => ({ useTokenizer: vi.fn() }));
vi.mock("./use-tokenizer", () => tokenizer);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const READY: TokenizerState = {
  loading: false,
  error: null,
  result: { tokenCount: 3, truncated: false, segments: [{ text: "Hi", ids: [1] }, { text: " there", ids: [2] }, { text: "!", ids: [3] }] },
};

function setup(text: string | null = "Hi there!") {
  const store = createStore();
  store.set(atom_tokenizerText, text);
  render(
    <Provider store={store}>
      <TokenizerTool />
    </Provider>,
  );
  return store;
}

describe("TokenizerTool", () => {
  beforeEach(() => tokenizer.useTokenizer.mockReturnValue(READY));
  afterEach(() => sessionStorage.clear());

  it("shows the counts and highlights every token", () => {
    setup();
    expect(screen.getByText("Tokens", { selector: "dt" }).nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Words", { selector: "dt" }).nextSibling).toHaveTextContent("2");
    expect(screen.getByTitle("Token 2")).toHaveTextContent("there");
  });

  it("starts from the first example, and loads another on click", () => {
    const store = setup(null);
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveValue(TOKENIZER_EXAMPLES[0].text);
    fireEvent.click(screen.getByRole("button", { name: TOKENIZER_EXAMPLES[2].label }));
    expect(store.get(atom_tokenizerText)).toBe(TOKENIZER_EXAMPLES[2].text);
  });

  it("switches the encoding and shows token IDs on request", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "cl100k" }));
    expect(store.get(atom_tokenizerEncoding)).toBe("cl100k_base");
    fireEvent.click(screen.getByRole("button", { name: "Show token IDs" }));
    expect(screen.getByText("1, 2, 3")).toBeInTheDocument();
  });

  it("clears to an empty box that stays empty", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(store.get(atom_tokenizerText)).toBe("");
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveValue("");
  });

  it("says when the tokenizer is still loading", () => {
    tokenizer.useTokenizer.mockReturnValue({ loading: true, error: null, result: null });
    setup();
    expect(screen.getByText("Loading tokenizer…")).toBeInTheDocument();
  });
});
