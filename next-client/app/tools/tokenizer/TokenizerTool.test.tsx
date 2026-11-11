import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_tokenizerEncoding, atom_tokenizerText, type TokenizerEncoding } from "@/app/atoms/tool-atoms";
import TokenizerTool from "./TokenizerTool";
import { TOKENIZER_EXAMPLES } from "./tokenizer-examples";
import type { TokenizerState } from "./use-tokenizer";

const tokenizer = vi.hoisted(() => ({ useTokenizer: vi.fn() }));
const toasts = vi.hoisted(() => ({ showCopyToast: vi.fn(), showErrorToast: vi.fn() }));
vi.mock("./use-tokenizer", () => tokenizer);
vi.mock("@/app/components/Toastr", () => toasts);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const READY: TokenizerState = {
  loading: false,
  error: null,
  resultEncoding: "o200k_base",
  stale: false,
  result: { tokenCount: 3, truncated: false, segments: [{ text: "Hi", ids: [1] }, { text: " there", ids: [2] }, { text: "!", ids: [3] }] },
};

function setup(text: string | null = "Hi there!", encoding: TokenizerEncoding = "o200k_base") {
  const store = createStore();
  store.set(atom_tokenizerText, text);
  store.set(atom_tokenizerEncoding, encoding);
  render(
    <Provider store={store}>
      <TokenizerTool />
    </Provider>,
  );
  return store;
}

describe("TokenizerTool", () => {
  beforeEach(() => {
    tokenizer.useTokenizer.mockReturnValue(READY);
    toasts.showCopyToast.mockClear();
    toasts.showErrorToast.mockClear();
  });
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
    fireEvent.click(screen.getByRole("button", { name: "IDs" }));
    expect(screen.getByText("1, 2, 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    expect(screen.getByTitle("Token 2")).toBeInTheDocument();
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

  it("keeps the last result on screen and marks it as updating while a change is counted", () => {
    tokenizer.useTokenizer.mockReturnValue({ ...READY, stale: true });
    setup();
    expect(screen.getByText("Updating…")).toBeInTheDocument();
    expect(screen.getByTitle("Token 2")).toHaveTextContent("there");
  });

  it("shows no updating mark once the result is current", () => {
    setup();
    expect(screen.queryByText("Updating…")).not.toBeInTheDocument();
  });

  it("switches back to the encoding on screen when a new one fails to load", async () => {
    tokenizer.useTokenizer.mockReturnValue({ ...READY, error: "network down", resultEncoding: "o200k_base" });
    const store = setup("Hi there!", "cl100k_base");
    await waitFor(() => expect(store.get(atom_tokenizerEncoding)).toBe("o200k_base"));
    expect(toasts.showErrorToast).toHaveBeenCalledWith(expect.stringContaining("cl100k"));
    // The old result was never replaced by an error.
    expect(screen.getByTitle("Token 2")).toBeInTheDocument();
  });

  it("shows the error when there is no result to fall back on", () => {
    tokenizer.useTokenizer.mockReturnValue({ loading: false, error: "boom", result: null });
    setup();
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });

  it("reads a token's ID and text when it is clicked, and with the arrow keys", () => {
    setup();
    fireEvent.click(screen.getByTitle("Token 2"));
    expect(screen.getByText(/Token 2 of 3 · ID 2 · " there"/)).toBeInTheDocument();
    const group = screen.getByRole("group", { name: /Tokens\./ });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(screen.getByText(/Token 3 of 3 · ID 3 · "!"/)).toBeInTheDocument();
    fireEvent.keyDown(group, { key: "Home" });
    expect(screen.getByText(/Token 1 of 3 · ID 1/)).toBeInTheDocument();
  });

  it("draws spaces on request", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Show spaces" }));
    expect(screen.getByTitle("Token 2")).toHaveTextContent("·there");
  });

  it("prices the text on each model under the stats", () => {
    setup();
    expect(screen.getByRole("heading", { name: "What it costs as input" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /Claude Opus 5\.5/ })).toBeInTheDocument();
  });

  it("copies the token IDs and the count", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Copy IDs" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("1, 2, 3"));
    fireEvent.click(screen.getByRole("button", { name: "Copy count" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("3 tokens"));
    expect(toasts.showCopyToast).toHaveBeenCalledTimes(2);
  });

  it("loads a dropped text file into the box", async () => {
    const store = setup();
    const file = new File(["# Dropped"], "note.md", { type: "text/markdown" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("# Dropped") });
    fireEvent.drop(screen.getByRole("textbox", { name: "Text" }), { dataTransfer: { files: [file] } });
    await waitFor(() => expect(store.get(atom_tokenizerText)).toBe("# Dropped"));
  });

  it("refuses a file over 5 MB", async () => {
    const store = setup();
    const file = new File(["x"], "big.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: 6_000_000 });
    fireEvent.drop(screen.getByRole("textbox", { name: "Text" }), { dataTransfer: { files: [file] } });
    await waitFor(() => expect(toasts.showErrorToast).toHaveBeenCalledWith(expect.stringContaining("5 MB")));
    expect(store.get(atom_tokenizerText)).toBe("Hi there!");
  });
});
