import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { exportActivePdf } from "../utils/open-helper-dialogs";
import { useExportPdf, VEILED_REASON, vaultImagePath } from "./use-export-pdf";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

let registered: Command | null = null;
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useRegisterCommand: (command: Command | null) => { registered = command; },
}));

const printHtml = vi.fn(async (_html: string, cleanup?: () => void) => { cleanup?.(); });
vi.mock("../utils/print-note", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/print-note")>()),
  printHtml: (html: string, cleanup?: () => void) => printHtml(html, cleanup),
}));
vi.mock("../utils/render-mermaid", () => ({ renderMermaid: vi.fn(async () => "<svg>diagram</svg>") }));
vi.mock("../utils/render-math", () => ({ renderMathMl: vi.fn(async () => { throw new Error("bad formula"); }) }));
const toastError = vi.fn();
vi.mock("react-hot-toast", () => ({ default: { error: (...args: unknown[]) => toastError(...args) } }));

function setup(path: string, content: string) {
  const store = createStore();
  store.set(atom_openFiles, {
    [path]: { content, lastSavedContent: content, fileName: path.split("/").pop()!, activeFilePath: path },
  });
  store.set(atom_workspaceLayout, {
    rootContainer: { id: "default-pane", type: "editor", openFilePaths: [path], activeFilePath: path, isPinned: false },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const hook = renderHook(() => useExportPdf(), { wrapper });
  return { store, hook };
}

describe("vaultImagePath", () => {
  it("resolves paths against the note's folder or the vault root", () => {
    expect(vaultImagePath("journal/2026/2026-Q4.md", "assets/chart.png")).toBe("journal/2026/assets/chart.png");
    expect(vaultImagePath("journal/2026/2026-Q4.md", "../img/a%20b.png")).toBe("journal/img/a b.png");
    expect(vaultImagePath("journal/2026/2026-Q4.md", "/assets/a.png")).toBe("assets/a.png");
    expect(vaultImagePath("note.md", "../../escape.png")).toBeNull();
    expect(vaultImagePath("note.md", "https://example.com/a.png")).toBeNull();
  });
});

describe("useExportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registered = null;
    localStorage.clear();
  });

  it("registers Export as PDF…, opens the dialog, and prints the rendered note under its H1 title", async () => {
    const { hook } = setup("reviews/2026-Q4.md", "---\nowner: product\n---\n# Q4 review\n\n- [x] Ship billing\n\n```mermaid\ngraph TD; A-->B\n```\n\n$$\nx^\n$$");
    expect(registered).toMatchObject({ id: "export-pdf", label: "Export as PDF…", category: "Document" });
    expect(registered?.disabledReason).toBeUndefined();

    await act(async () => { await registered!.action(); });
    await vi.waitFor(() => expect(hook.result.current.job?.title).toBe("Q4 review"));
    expect(printHtml).not.toHaveBeenCalled();

    await act(async () => { await hook.result.current.print(); });
    expect(hook.result.current.job).toBeNull();
    expect(printHtml).toHaveBeenCalledOnce();
    const html = printHtml.mock.calls[0][0];
    expect(html).toContain("<title>Q4 review</title>");
    expect(html).toContain("Ship billing");
    expect(html).not.toContain("owner: product");
    expect(html).toContain('<div class="rendered mermaid"><svg>diagram</svg></div>');
    expect(html).toContain("Formula error: bad formula");
  });

  it("answers the toolbar's More menu event", async () => {
    const { hook } = setup("note.md", "Plain note");
    await act(async () => {
      exportActivePdf();
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(hook.result.current.job?.title).toBe("note"));
  });

  it("reads the page setup from frontmatter and breaks pages at the marker", async () => {
    const { hook } = setup(
      "specs/billing.md",
      '---\npdf_page_size: Letter\npdf_margins: 1in\npdf_footer: "{page} / {pages}"\npdf_page_break: "---"\n---\n# Billing\n\nPart one\n\n---\n\nPart two',
    );
    await act(async () => { await registered!.action(); });
    await vi.waitFor(() => expect(hook.result.current.job).not.toBeNull());
    const job = hook.result.current.job!;
    expect(job.settings).toMatchObject({ pageSize: "Letter", margins: "1in", footer: "{page} / {pages}", pageBreak: "---" });
    expect(job.body).toContain('<div class="page-break"></div>');

    await act(async () => { await hook.result.current.print(); });
    const html = printHtml.mock.calls[0][0];
    expect(html).toContain("size: Letter; margin: 1in;");
    expect(html).toContain('@bottom-center { content: counter(page) " / " counter(pages);');
  });

  it("closes the dialog without printing on cancel", async () => {
    const { hook } = setup("note.md", "Plain note");
    await act(async () => { await registered!.action(); });
    await vi.waitFor(() => expect(hook.result.current.job).not.toBeNull());
    act(() => hook.result.current.close());
    expect(hook.result.current.job).toBeNull();
    expect(printHtml).not.toHaveBeenCalled();
  });

  it("is disabled for a veiled private note until it's shown", async () => {
    const { store, hook } = setup("private/plan.md", "---\nprivate: true\n---\n# Plan");
    expect(registered?.disabledReason).toBe(VEILED_REASON);
    await act(async () => { exportActivePdf(); await Promise.resolve(); });
    expect(printHtml).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(VEILED_REASON);

    act(() => { store.set(atom_revealedPrivatePaths, new Set(["private/plan.md"])); });
    hook.rerender();
    expect(registered?.disabledReason).toBeUndefined();
  });
});
