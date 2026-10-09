import { act, render, screen, within } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { openTokenCostDialog } from "../utils/open-helper-dialogs";
import TokenCostDialog from "./TokenCostDialog";

const tokenizer = vi.hoisted(() => ({ useTokenizer: vi.fn() }));
vi.mock("@/app/tools/tokenizer/use-tokenizer", () => tokenizer);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function setup() {
  const store = createStore();
  store.set(atom_openFiles, {
    draft: { content: "# Release plan\n\nShip it.", fileName: "release-plan.md" },
  } as never);
  render(
    <Provider store={store}>
      <TokenCostDialog />
    </Provider>,
  );
}

describe("TokenCostDialog", () => {
  beforeEach(() => {
    tokenizer.useTokenizer.mockReturnValue({ loading: false, error: null, result: { tokenCount: 1234, segments: [], truncated: false } });
  });

  it("loads no tokenizer until opened", () => {
    setup();
    expect(tokenizer.useTokenizer).not.toHaveBeenCalled();
    expect(screen.queryByText("Token cost")).not.toBeInTheDocument();
  });

  it("counts the open note and prices it per model", () => {
    setup();
    act(() => openTokenCostDialog());
    expect(tokenizer.useTokenizer).toHaveBeenCalledWith("# Release plan\n\nShip it.", "o200k_base", { countOnly: true });
    expect(screen.getByText("Token cost")).toBeInTheDocument();
    expect(screen.getByText(/release-plan\.md/)).toBeInTheDocument();
    expect(screen.getByText("1,234 tokens")).toBeInTheDocument();
    // Input only: Claude Opus 5.5 at $4 per 1M.
    const row = screen.getByRole("rowheader", { name: /Claude Opus 5\.5/ }).closest("tr")!;
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["$0.0049"]);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
