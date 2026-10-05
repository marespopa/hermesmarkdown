import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { useVaultTemplateInsert } from "./use-vault-template-insert";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const pickTemplate = vi.fn();
vi.mock("@/app/hooks/use-template-dialog", () => ({
  useTemplateDialog: () => ({ pickTemplate, askPrompts: vi.fn() }),
}));
const readTemplate = vi.fn();
const instantiate = vi.fn();
vi.mock("@/app/hooks/file-system/use-template-notes", () => ({
  useTemplateNotes: () => ({ readTemplate, instantiate }),
}));

const RFC = { name: "rfc", path: "templates/rfc.md" };
const EXPANDED = { text: "---\nstatus: draft\n---\n# Auth\nOwner: Ana\n", cursor: "---\nstatus: draft\n---\n# Auth\n".length };

function setup(doc: string, filePath = "notes/auth.md") {
  const store = createStore();
  store.set(atom_fileMetadata, {
    "notes/auth.md": {
      path: "notes/auth.md",
      name: "auth.md",
      tags: [],
      links: [],
      frontmatter: { title: "Auth" },
      modifiedAt: 1,
      wordCount: 0,
      tasks: [],
      handle: null,
    } satisfies FileMetadata,
  });
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({
    state: EditorState.create({ doc, selection: EditorSelection.cursor(doc.length) }),
    parent,
  });
  const viewRef = { current: view as EditorView | null };
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useVaultTemplateInsert({ viewRef, filePath }), { wrapper });
  return { view, viewRef, insert: result.current };
}

describe("useVaultTemplateInsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pickTemplate.mockResolvedValue(RFC);
    readTemplate.mockResolvedValue("raw");
    instantiate.mockResolvedValue({ routing: {}, expanded: EXPANDED });
  });

  it("inserts the whole template, frontmatter included, into a blank note", async () => {
    const { view, insert } = setup("  \n");
    await act(() => insert());

    expect(instantiate).toHaveBeenCalledWith("raw", "Auth", "Insert");
    expect(view.state.doc.toString()).toBe(`  \n${EXPANDED.text}`);
    expect(view.state.selection.main.head).toBe(3 + EXPANDED.cursor);
  });

  it("inserts only the body into a non-empty note, caret moved along", async () => {
    const { view, insert } = setup("Intro\n");
    await act(() => insert());

    expect(view.state.doc.toString()).toBe("Intro\n# Auth\nOwner: Ana\n");
    expect(view.state.selection.main.head).toBe("Intro\n# Auth\n".length);
  });

  it("inserts a given template without opening the picker", async () => {
    const { view, insert } = setup("");
    await act(() => insert(RFC));

    expect(pickTemplate).not.toHaveBeenCalled();
    expect(readTemplate).toHaveBeenCalledWith(RFC);
    expect(view.state.doc.toString()).toBe(EXPANDED.text);
  });

  it("uses a starter's text as is", async () => {
    const { insert } = setup("");
    await act(() => insert({ name: "Spec", body: "# {{title}}" }));

    expect(readTemplate).not.toHaveBeenCalled();
    expect(instantiate).toHaveBeenCalledWith("# {{title}}", "Auth", "Insert");
  });

  it("uses an empty title in the draft", async () => {
    const { insert } = setup("", "draft");
    await act(() => insert());
    expect(instantiate).toHaveBeenCalledWith("raw", "", "Insert");
  });

  it("inserts nothing when the picker is cancelled", async () => {
    pickTemplate.mockResolvedValue(null);
    const { view, insert } = setup("Intro");
    await act(() => insert());
    expect(readTemplate).not.toHaveBeenCalled();
    expect(view.state.doc.toString()).toBe("Intro");
  });

  it("inserts nothing when the prompts are cancelled", async () => {
    instantiate.mockResolvedValue(null);
    const { view, insert } = setup("Intro");
    await act(() => insert());
    expect(view.state.doc.toString()).toBe("Intro");
  });

  it("inserts nothing when the editor went away meanwhile", async () => {
    const { view, viewRef, insert } = setup("Intro");
    instantiate.mockImplementation(async () => {
      view.destroy();
      viewRef.current = null;
      return { routing: {}, expanded: EXPANDED };
    });
    await act(() => insert());
    expect(view.state.doc.toString()).toBe("Intro");
  });
});
