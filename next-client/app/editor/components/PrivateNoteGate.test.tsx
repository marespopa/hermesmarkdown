import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import PrivateNoteGate from "./PrivateNoteGate";

const PRIVATE = "---\nprivate: true\ntitle: Payroll\n---\n\nSalary figures";
const PLAIN = "# Groceries\n\nMilk";

// Stands in for MarkdownEditor: the gate only decides whether it mounts.
const Editor = ({ content }: { content: string }) => <div data-testid="editor">{content}</div>;

function setup(store = createStore()) {
  const view = (filePath: string, content: string, key = filePath) => (
    <Provider store={store}>
      <PrivateNoteGate key={key} filePath={filePath} content={content} isActivePane>
        <Editor content={content} />
      </PrivateNoteGate>
    </Provider>
  );
  const utils = render(view("a.md", ""));
  return { store, show: (filePath: string, content: string, key?: string) => utils.rerender(view(filePath, content, key)), unmount: utils.unmount };
}

describe("PrivateNoteGate", () => {
  beforeEach(() => cleanup());

  it("veils private content without mounting the editor", () => {
    const { show } = setup();
    show("a.md", PRIVATE);
    expect(screen.getByTestId("private-note-veil")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.queryByTestId("editor")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Salary figures");
  });

  it("reveals the note on Show note and remembers it for the session", () => {
    const { store, show } = setup();
    show("a.md", PRIVATE);
    fireEvent.click(screen.getByRole("button", { name: "Show file" }));
    expect(screen.getByTestId("editor")).toHaveTextContent("Salary figures");
    expect(store.get(atom_revealedPrivatePaths).has("a.md")).toBe(true);

    // A fresh editor instance for the same path (switching tabs and back).
    show("a.md", PRIVATE, "a.md#2");
    expect(screen.queryByTestId("private-note-veil")).not.toBeInTheDocument();
    expect(screen.getByTestId("editor")).toBeInTheDocument();
  });

  it("reveals every private note on Show all", () => {
    const { store, show } = setup();
    show("a.md", PRIVATE);
    fireEvent.click(screen.getByRole("button", { name: "Show all private files this session" }));
    expect(store.get(atom_revealAllPrivate)).toBe(true);

    show("b.md", PRIVATE);
    expect(screen.queryByTestId("private-note-veil")).not.toBeInTheDocument();
    expect(screen.getByTestId("editor")).toBeInTheDocument();
  });

  it("stays shown when an open note becomes private mid-edit", () => {
    const { show } = setup();
    show("a.md", PLAIN);
    expect(screen.getByTestId("editor")).toBeInTheDocument();
    show("a.md", PRIVATE);
    expect(screen.queryByTestId("private-note-veil")).not.toBeInTheDocument();
    expect(screen.getByTestId("editor")).toBeInTheDocument();
  });

  it("keeps a note marked private while shown revealed after a remount", () => {
    const { store, show } = setup();
    show("a.md", PLAIN);
    show("a.md", PRIVATE);
    expect(store.get(atom_revealedPrivatePaths).has("a.md")).toBe(true);

    // A fresh editor instance for the same path (switching tabs and back).
    show("a.md", PRIVATE, "a.md#2");
    expect(screen.queryByTestId("private-note-veil")).not.toBeInTheDocument();
    expect(screen.getByTestId("editor")).toBeInTheDocument();
  });

  it("veils when the first content is empty and private content loads after", () => {
    const { show } = setup();
    // setup() rendered "a.md" with empty content first.
    show("a.md", PRIVATE);
    expect(screen.getByTestId("private-note-veil")).toBeInTheDocument();
  });

  it("veils a note that is private only in the indexed metadata", () => {
    const store = createStore();
    const meta: FileMetadata = {
      path: "a.md", name: "a.md", tags: [], links: [], frontmatter: { tags: "private" },
      modifiedAt: 1, wordCount: 1, tasks: [], handle: null,
    };
    store.set(atom_fileMetadata, { "a.md": meta });
    const { show } = setup(store);
    show("a.md", "Body without frontmatter");
    expect(screen.getByTestId("private-note-veil")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
  });
});
