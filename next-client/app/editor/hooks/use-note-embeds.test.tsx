import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import type { FileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useNoteEmbeds } from "./use-note-embeds";

function meta(path: string, text: string, frontmatter: Record<string, unknown> = {}): FileMetadata {
  return {
    path,
    name: path.split("/").pop()!,
    tags: [],
    links: [],
    frontmatter,
    modifiedAt: 1,
    wordCount: 0,
    tasks: [],
    handle: { getFile: vi.fn(async () => ({ text: async () => text })) },
  };
}

function setup(value: string, files: FileMetadata[], fromPath = "Status.md") {
  const store = createStore();
  const metadata = Object.fromEntries(files.map((file) => [file.path, file]));
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const open = vi.fn();
  const hook = renderHook(() => useNoteEmbeds(null, value, metadata, fromPath, open), { wrapper });
  return { store, hook, open };
}

describe("useNoteEmbeds", () => {
  it("reads embedded notes from disk and marks missing and self embeds", async () => {
    const { hook } = setup("![[Roadmap]]\n![[Gone]]\n![[Status]]", [meta("Roadmap.md", "# Roadmap"), meta("Status.md", "x")]);
    await waitFor(() => expect(hook.result.current.contents.size).toBe(3));
    const { contents } = hook.result.current;
    expect(contents.get("roadmap")).toEqual({ kind: "note", path: "Roadmap.md", markdown: "# Roadmap" });
    expect(contents.get("gone")).toEqual({ kind: "missing" });
    expect(contents.get("status")).toEqual({ kind: "self" });
  });

  it("prefers an open tab's unsaved text", async () => {
    const { store, hook } = setup("![[Roadmap]]", [meta("Roadmap.md", "on disk")]);
    store.set(atom_openFiles, {
      "Roadmap.md": { content: "unsaved", lastSavedContent: "on disk", fileName: "Roadmap", activeFilePath: "Roadmap.md" },
    });
    await waitFor(() => expect(hook.result.current.contents.get("roadmap")).toMatchObject({ markdown: "unsaved" }));
  });

  it("veils private notes", async () => {
    const { hook } = setup("![[Journal]]", [meta("Journal.md", "---\nprivate: true\n---\nSecret", { private: true })]);
    await waitFor(() => expect(hook.result.current.contents.get("journal")).toEqual({ kind: "private" }));
  });

  it("reads an embedded CSV next to the note as a table", async () => {
    const csv = { getFile: async () => ({ text: async () => "product,status\nSync,shipped" }) };
    const reports = { getFileHandle: vi.fn(async (name: string) => { if (name === "sales.csv") return csv; throw new Error("NotFound"); }) };
    const vault = { getDirectoryHandle: vi.fn(async () => reports), getFileHandle: vi.fn(async () => { throw new Error("NotFound"); }) };
    const { store, hook } = setup("/sales.csv\n/missing.csv", [], "reports/Weekly.md");
    store.set(atom_vaultHandle, vault as unknown as FileSystemDirectoryHandle);
    await waitFor(() => expect(hook.result.current.contents.get("sales.csv")).toMatchObject({ kind: "note", path: "reports/sales.csv" }));
    expect((hook.result.current.contents.get("sales.csv") as { markdown: string }).markdown).toMatch(/\| Sync\s+\| shipped\s+\|/);
    expect(hook.result.current.contents.get("missing.csv")).toEqual({ kind: "missing" });
  });

  it("returns no contents when there are no embeds", () => {
    const { hook } = setup("Plain [[Roadmap]] link", [meta("Roadmap.md", "x")]);
    expect(hook.result.current.contents.size).toBe(0);
  });
});
