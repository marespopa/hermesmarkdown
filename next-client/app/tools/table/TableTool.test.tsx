import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_tableToolMarkdown } from "@/app/atoms/tool-atoms";
import TableTool from "./TableTool";
import type { ReplaceRequest } from "./TableGridEditor";

// The grid is a CodeMirror view; this stand-in applies replace requests and
// reports the new document, as the real one does.
vi.mock("./TableGridEditor", () => ({
  default: function GridStub({ onChange, replaceRequest }: { onChange: (doc: string) => void; replaceRequest: ReplaceRequest | null }) {
    useEffect(() => {
      if (replaceRequest) onChange(replaceRequest.doc);
    }, [replaceRequest, onChange]);
    return <div data-testid="grid" />;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const toasts = vi.hoisted(() => ({ showCopyToast: vi.fn(), showErrorToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => toasts);

function setup(doc: string | null = null) {
  const store = createStore();
  store.set(atom_tableToolMarkdown, doc);
  render(
    <Provider store={store}>
      <TableTool />
    </Provider>,
  );
  return store;
}

const output = () => screen.getByLabelText("Markdown output").textContent;

describe("TableTool", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => sessionStorage.clear());

  it("starts with an empty three-column table", () => {
    setup();
    expect(output()).toContain("| Header 1 | Header 2 | Header 3 |");
  });

  it("makes a new table of the chosen size, clamped", () => {
    const store = setup();
    fireEvent.change(screen.getByLabelText("Columns"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Rows"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "New table" }));
    const lines = store.get(atom_tableToolMarkdown)!.split("\n");
    expect(lines[0]).toBe("| Header 1 | Header 2 |");
    expect(lines).toHaveLength(102);
  });

  it("converts pasted CSV, and explains text without columns", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "From CSV or spreadsheet" }));
    const box = screen.getByRole("textbox", { name: "CSV or spreadsheet cells" });
    fireEvent.change(box, { target: { value: "just words" } });
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByText("Couldn't find comma- or tab-separated columns.")).toBeInTheDocument();

    fireEvent.change(box, { target: { value: "Name,Role\nAda,Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));
    expect(store.get(atom_tableToolMarkdown)).toContain("Ada");
    expect(output()).toContain("| Ada  | Engineer |");
  });

  it("copies the aligned Markdown", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup("| a |\n|---|\n| b |");
    fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }));
    await vi.waitFor(() => expect(toasts.showCopyToast).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith("| a   |\n| :-- |\n| b   |");
  });

  it("copies formula results by default, or the formulas on request", () => {
    setup("| Item | Cost |\n|---|---|\n| Rent | 1000 |\n| Food | 400 |\n| Total | =SUM(B2:B3) |");
    expect(output()).toMatch(/\| Total \| 1,?400/);
    fireEvent.click(screen.getByRole("button", { name: "Formulas" }));
    expect(output()).toContain("=SUM(B2:B3)");
    expect(screen.getByText("Formulas keep calculating in the editor.")).toBeInTheDocument();
  });

  it("shows no formula switch for a table without formulas", () => {
    setup();
    expect(screen.queryByRole("group", { name: "Formula cells" })).not.toBeInTheDocument();
  });

  it("disables Copy and Open when there's no table", () => {
    setup("");
    expect(screen.getByText("No table yet. Start a new table above.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Markdown" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open in HermesMarkdown" })).toBeDisabled();
  });
});
