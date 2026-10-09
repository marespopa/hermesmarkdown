import { act, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_cleanerFormat, atom_cleanerInput } from "@/app/atoms/tool-atoms";
import MarkdownCleanerTool from "./MarkdownCleanerTool";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const toasts = vi.hoisted(() => ({ showCopyToast: vi.fn(), showErrorToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => toasts);

function setup(input: string | null = null) {
  const store = createStore();
  store.set(atom_cleanerInput, input);
  render(
    <Provider store={store}>
      <MarkdownCleanerTool />
    </Provider>,
  );
  return store;
}

const output = () => screen.queryByLabelText("Clean Markdown", { selector: "pre" });
const input = () => screen.getByRole("textbox", { name: "Paste here" });

function paste(types: Record<string, string>) {
  fireEvent.paste(input(), { clipboardData: { getData: (type: string) => types[type] ?? "" } });
}

describe("MarkdownCleanerTool", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => sessionStorage.clear());

  it("starts from the messy Markdown example, cleaned, with its fixes", () => {
    setup();
    expect(output()?.textContent).toContain("# Project notes");
    expect(output()?.textContent).toContain("  - Fix list indents");
    expect(screen.getByRole("list", { name: "Fixes" })).toBeInTheDocument();
  });

  it("cleans what is typed", () => {
    setup("");
    fireEvent.change(input(), { target: { value: "##Title" } });
    expect(output()?.textContent).toBe("## Title\n");
  });

  it("says when the input is already clean", () => {
    setup("# Fine\n");
    expect(screen.getByText("Already clean.")).toBeInTheDocument();
  });

  it("takes the HTML of a rich paste and converts it", () => {
    const store = setup("");
    paste({ "text/html": "<h2>Heading</h2><p><strong>Bold</strong></p>", "text/plain": "Heading Bold" });
    expect(store.get(atom_cleanerInput)).toBe("<h2>Heading</h2><p><strong>Bold</strong></p>");
    expect(output()?.textContent).toBe("## Heading\n\n**Bold**\n");
    expect(screen.getByText(/Detected: HTML/)).toBeInTheDocument();
  });

  it("leaves a paste without structured HTML to the browser", () => {
    const store = setup("");
    paste({ "text/html": '<div><span style="color:red">const</span> a</div>', "text/plain": "const a" });
    expect(store.get(atom_cleanerInput)).toBe("");
  });

  it("leaves rich pastes alone when Markdown is chosen", () => {
    const store = setup("");
    act(() => store.set(atom_cleanerFormat, "markdown"));
    paste({ "text/html": "<p><b>x</b></p>" });
    expect(store.get(atom_cleanerInput)).toBe("");
  });

  it("copies the clean Markdown", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup("*  item");
    fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }));
    expect(writeText).toHaveBeenCalledWith("- item\n");
  });

  it("clears the input and disables the actions", () => {
    setup("text");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input()).toHaveValue("");
    expect(screen.getByText("Paste something to clean.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Markdown" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Open in HermesMarkdown/ })).toBeDisabled();
  });
});
