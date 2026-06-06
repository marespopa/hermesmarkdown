import { createStore } from "jotai";
import { describe, it, expect, beforeEach } from "vitest";
import {
  atom_openFiles,
  atom_fileContent,
  atom_content,
  atom_workspaceLayout,
  atom_fileName,
  atom_lastSavedContent
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
});
