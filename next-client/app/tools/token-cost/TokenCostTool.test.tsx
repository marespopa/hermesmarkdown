import { fireEvent, render, screen, within } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_tokenCostOutputTokens, atom_tokenCostText } from "@/app/atoms/tool-atoms";
import type { TokenizerState } from "../tokenizer/use-tokenizer";
import TokenCostTool from "./TokenCostTool";

const tokenizer = vi.hoisted(() => ({ useTokenizer: vi.fn() }));
vi.mock("../tokenizer/use-tokenizer", () => tokenizer);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const READY: TokenizerState = { loading: false, error: null, result: { tokenCount: 2_000_000, segments: [], truncated: false } };

function setup(text: string | null = "Some prompt") {
  const store = createStore();
  store.set(atom_tokenCostText, text);
  store.set(atom_tokenCostOutputTokens, 1_000_000);
  render(
    <Provider store={store}>
      <TokenCostTool />
    </Provider>,
  );
  return store;
}

const row = (name: string) => screen.getByRole("rowheader", { name: new RegExp(name) }).closest("tr")!;

describe("TokenCostTool", () => {
  beforeEach(() => tokenizer.useTokenizer.mockReturnValue(READY));
  afterEach(() => sessionStorage.clear());

  it("counts the text and prices input, reply and total per model", () => {
    setup();
    expect(tokenizer.useTokenizer).toHaveBeenCalledWith("Some prompt", "o200k_base", { countOnly: true });
    expect(screen.getByText("2,000,000")).toBeInTheDocument();
    // GPT-5.5: $5 / $30 per 1M.
    const cells = within(row("GPT-5.5")).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual(["$10.00", "$30.00", "$40.00"]);
  });

  it("stores the reply length as a whole, non-negative number", () => {
    const store = setup();
    const input = screen.getByRole("spinbutton", { name: "Reply length (tokens)" });
    fireEvent.change(input, { target: { value: "250" } });
    expect(store.get(atom_tokenCostOutputTokens)).toBe(250);
    fireEvent.change(input, { target: { value: "-3" } });
    expect(store.get(atom_tokenCostOutputTokens)).toBe(0);
  });

  it("shows a placeholder while the tokenizer loads", () => {
    tokenizer.useTokenizer.mockReturnValue({ loading: true, error: null, result: null });
    setup();
    expect(within(row("GPT-5.5")).getAllByRole("cell")[0]).toHaveTextContent("…");
  });

  it("clears to an empty box that stays empty", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(store.get(atom_tokenCostText)).toBe("");
  });
});
