import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { exportActiveHtml } from "../utils/open-helper-dialogs";
import { htmlFileName } from "../utils/html-export";
import { useExportHtml } from "./use-export-html";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

let registered: Command | null = null;
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useRegisterCommand: (command: Command | null) => { registered = command; },
}));

const downloadText = vi.fn((...args: [content: string, name: string, type: string]) => args[1]);
vi.mock("@/app/utils/download-markdown", () => ({
  downloadText: (content: string, name: string, type: string) => downloadText(content, name, type),
}));
vi.mock("../utils/render-mermaid", () => ({ renderMermaid: vi.fn(async () => "<svg>diagram</svg>") }));
vi.mock("../utils/render-math", () => ({ renderMathMl: vi.fn(async () => "<math>x</math>") }));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: { error: (...args: unknown[]) => toastError(...args), success: (...args: unknown[]) => toastSuccess(...args) },
}));

function setup(path: string, content: string) {
  const store = createStore();
  store.set(atom_openFiles, {
    [path]: { content, lastSavedContent: content, fileName: path.split("/").pop()!, activeFilePath: path },
  });
  store.set(atom_workspaceLayout, {
    rootContainer: { id: "default-pane", openFilePaths: [path], activeFilePath: path, isPinned: false },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => useExportHtml(), { wrapper });
  return store;
}

describe("useExportHtml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registered = null;
  });

  it("downloads the rendered note as one standalone .html file", async () => {
    setup("reviews/2026-Q4.md", "---\nowner: product\n---\n# Q4 review\n\n- [x] Ship billing\n\n```mermaid\ngraph TD; A-->B\n```");
    expect(registered).toMatchObject({ id: "export-html", label: "Export as HTML", category: "Document" });

    await act(async () => { await registered!.action(); });
    await vi.waitFor(() => expect(downloadText).toHaveBeenCalledOnce());
    const [html, name, type] = downloadText.mock.calls[0];
    expect(name).toBe("2026-Q4.html");
    expect(type).toBe("text/html");
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("<title>Q4 review</title>");
    expect(html).toContain("Ship billing");
    expect(html).not.toContain("owner: product");
    expect(html).toContain('<div class="rendered mermaid"><svg>diagram</svg></div>');
    expect(html).toContain("prefers-color-scheme: dark");
    expect(toastSuccess).toHaveBeenCalledWith("Downloaded 2026-Q4.html");
  });

  it("keeps each <details> section open or closed as the note has it", async () => {
    setup("note.md", "<details>\n<summary>Closed</summary>\n\nBody\n\n</details>\n\n<details open>\n<summary>Open</summary>\n\nMore\n\n</details>");
    await act(async () => { await registered!.action(); });
    await vi.waitFor(() => expect(downloadText).toHaveBeenCalledOnce());
    const html = downloadText.mock.calls[0][0];
    expect(html).toContain("<details><summary>Closed</summary>");
    expect(html).toContain("<details open><summary>Open</summary>");
  });

  it("answers the toolbar's More menu event", async () => {
    setup("note.md", "Plain note");
    await act(async () => {
      exportActiveHtml();
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(downloadText).toHaveBeenCalledOnce());
  });

  it("refuses an empty note", async () => {
    setup("note.md", "   ");
    expect(registered?.disabledReason).toBe("The note is empty");
    await act(async () => { await registered!.action(); });
    expect(downloadText).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("The note is empty");
  });
});

describe("htmlFileName", () => {
  it("swaps the Markdown extension, or names a draft from its title", () => {
    expect(htmlFileName("Q4 review.md", "Q4 review")).toBe("Q4 review.html");
    expect(htmlFileName("", "Plans: Q4/Q1")).toBe("Plans Q4Q1.html");
    expect(htmlFileName("", "")).toBe("untitled.html");
  });
});
