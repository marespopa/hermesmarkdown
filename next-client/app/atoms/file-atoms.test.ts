import { createStore, getDefaultStore } from "jotai";
import { describe, it, expect, beforeEach } from "vitest";
import {
  atom_openFiles,
  atom_hasOpenFileContent,
  atom_fileContent,
  atom_content,
  atom_workspaceLayout,
  atom_fileName,
  atom_lastSavedContent,
  clearLegacyPaneModePreference,
  contentStore,
  migrateLegacyWorkspaceLayout,
} from "./atoms";

describe("file-atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("should have a default draft file in atom_openFiles", () => {
    const openFiles = store.get(atom_openFiles);
    expect(openFiles).toHaveProperty("draft");
    expect(openFiles.draft.fileName).toBe("untitled");
    expect(openFiles.draft.content).toBe("");
  });

  it("detects content in any persisted open file", () => {
    expect(store.get(atom_hasOpenFileContent)).toBe(false);

    store.set(atom_fileContent("notes/idea.md"), "A saved idea");

    expect(store.get(atom_hasOpenFileContent)).toBe(true);
  });

  it("should update file content via atom_fileContent family", () => {
    const testPath = "folder/test.md";
    store.set(atom_fileContent(testPath), "hello world");
    
    const openFiles = store.get(atom_openFiles);
    expect(openFiles[testPath]).toBeDefined();
    expect(openFiles[testPath].content).toBe("hello world");
    // It should infer the fileName from the path
    expect(openFiles[testPath].fileName).toBe("test");
  });

  it("should update active file content via atom_content", () => {
    // default-pane is active by default and points to 'draft'
    store.set(atom_content, "new draft content");
    
    const openFiles = store.get(atom_openFiles);
    expect(openFiles.draft.content).toBe("new draft content");
    expect(store.get(atom_content)).toBe("new draft content");
  });

  it("should update active file name via atom_fileName", () => {
    store.set(atom_fileName, "New Name");
    
    const openFiles = store.get(atom_openFiles);
    expect(openFiles.draft.fileName).toBe("New Name");
  });

  it("should update last saved content via atom_lastSavedContent", () => {
    store.set(atom_lastSavedContent, "saved state");
    
    const openFiles = store.get(atom_openFiles);
    expect(openFiles.draft.lastSavedContent).toBe("saved state");
  });

  it("should handle switching active file and updating its content", () => {
    const fileA = "a.md";
    const fileB = "b.md";
    
    // Initialize files
    store.set(atom_fileContent(fileA), "content a");
    store.set(atom_fileContent(fileB), "content b");
    
    // Set fileA as active in the layout
    const layout = store.get(atom_workspaceLayout);
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: {
        ...layout.rootContainer,
        activeFilePath: fileA,
        openFilePaths: [fileA, fileB]
      } as any
    });
    
    expect(store.get(atom_content)).toBe("content a");
    
    // Switch to fileB
    store.set(atom_workspaceLayout, {
      ...layout,
      rootContainer: {
        ...layout.rootContainer,
        activeFilePath: fileB,
        openFilePaths: [fileA, fileB]
      } as any
    });
    
    expect(store.get(atom_content)).toBe("content b");
    
    // Update content of active file (fileB)
    store.set(atom_content, "updated b");
    expect(store.get(atom_fileContent(fileB))).toBe("updated b");
    expect(store.get(atom_fileContent(fileA))).toBe("content a");
  });

  it("should use the singleton default Jotai store", () => {
    expect(contentStore).toBe(getDefaultStore());
  });

  it("should clear the legacy preview/edit mode storage key", () => {
    localStorage.setItem("defaultPaneMode", "preview");

    expect(localStorage.getItem("defaultPaneMode")).toBe("preview");

    clearLegacyPaneModePreference();

    expect(localStorage.getItem("defaultPaneMode")).toBeNull();
  });

  it("migrates legacy preview panes to the source editor", () => {
    localStorage.setItem("workspaceLayout", JSON.stringify({
      rootContainer: {
        id: "split",
        direction: "horizontal",
        sizes: [50, 50],
        children: [
          { id: "preview-pane", type: "preview", openFilePaths: ["note.md"], activeFilePath: "note.md", isPinned: false },
          { id: "editor-pane", type: "editor", openFilePaths: ["draft"], activeFilePath: "draft", isPinned: false },
        ],
      },
    }));

    migrateLegacyWorkspaceLayout();

    expect(JSON.parse(localStorage.getItem("workspaceLayout")!).rootContainer.children[0].type).toBe("editor");
  });
});
