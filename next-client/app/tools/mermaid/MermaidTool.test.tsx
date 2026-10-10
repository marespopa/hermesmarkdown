import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_mermaidToolSource } from "@/app/atoms/tool-atoms";
import MermaidTool from "./MermaidTool";
import { MERMAID_EXAMPLES } from "./mermaid-examples";

vi.mock("./use-live-mermaid", () => ({ useLiveMermaid: () => ({ svg: null, error: null, loading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const confirm = vi.fn();
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => ({ confirm }) }));
const toasts = vi.hoisted(() => ({ showCopyToast: vi.fn(), showErrorToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => toasts);

function setup(source: string | null = null) {
  const store = createStore();
  store.set(atom_mermaidToolSource, source);
  render(
    <Provider store={store}>
      <MermaidTool />
    </Provider>,
  );
  return store;
}

const chooseExample = (id: string) =>
  fireEvent.change(screen.getByLabelText("Start from an example"), { target: { value: id } });

describe("MermaidTool", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => sessionStorage.clear());

  it("starts from the first example", () => {
    setup();
    expect(screen.getByRole("textbox", { name: "Mermaid" })).toHaveValue(MERMAID_EXAMPLES[0].source);
  });

  it("swaps an untouched example without asking", async () => {
    const store = setup();
    chooseExample("pie");
    await waitFor(() => expect(store.get(atom_mermaidToolSource)).toContain("pie title"));
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks before replacing edits, and keeps them on cancel", async () => {
    const store = setup("graph TD\n  Mine --> Yours");
    confirm.mockResolvedValueOnce(false);
    chooseExample("pie");
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(store.get(atom_mermaidToolSource)).toBe("graph TD\n  Mine --> Yours");

    confirm.mockResolvedValueOnce(true);
    chooseExample("pie");
    await waitFor(() => expect(store.get(atom_mermaidToolSource)).toContain("pie title"));
  });

  it("copies the diagram as a fenced mermaid block", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup("graph TD\n  A --> B");
    fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }));
    await waitFor(() => expect(toasts.showCopyToast).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith("```mermaid\ngraph TD\n  A --> B\n```");
  });

  it("disables Copy and Open for an empty diagram", () => {
    setup("");
    expect(screen.getByRole("button", { name: "Copy Markdown" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open in HermesMarkdown" })).toBeDisabled();
  });
});
