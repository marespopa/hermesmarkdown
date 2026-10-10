import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_HANDOFF_CHARS, parseToolHandoff, TOOL_HANDOFF_KEY } from "@/app/utils/tool-handoff";
import OpenInWorkspaceButton from "./OpenInWorkspaceButton";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const toasts = vi.hoisted(() => ({ showErrorToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => toasts);

const open = () => fireEvent.click(screen.getByRole("button", { name: "Open in HermesMarkdown" }));

describe("OpenInWorkspaceButton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("hands the Markdown over and opens the editor, naming the tool", () => {
    render(<OpenInWorkspaceButton source="tokenizer" title="Tokenized text" getMarkdown={() => "Hello"} />);
    open();
    const handoff = parseToolHandoff(sessionStorage.getItem(TOOL_HANDOFF_KEY));
    expect(handoff).toMatchObject({ source: "tokenizer", title: "Tokenized text", markdown: "Hello" });
    expect(push).toHaveBeenCalledWith("/editor?from=tokenizer");
  });

  it("stays put with an error when the work is too large", () => {
    render(<OpenInWorkspaceButton source="tokenizer" title="T" getMarkdown={() => "x".repeat(MAX_HANDOFF_CHARS + 1)} />);
    open();
    expect(push).not.toHaveBeenCalled();
    expect(toasts.showErrorToast).toHaveBeenCalledWith("Too large to open in the workspace. Copy the text instead.");
  });

  it("stays put with an error when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<OpenInWorkspaceButton source="tokenizer" title="T" getMarkdown={() => "Hello"} />);
    open();
    expect(push).not.toHaveBeenCalled();
    expect(toasts.showErrorToast).toHaveBeenCalledWith("Couldn't open the workspace from here. Copy the text instead.");
  });

  it("does nothing while disabled", () => {
    render(<OpenInWorkspaceButton source="tokenizer" title="T" getMarkdown={() => "Hello"} disabled />);
    open();
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();
  });
});
