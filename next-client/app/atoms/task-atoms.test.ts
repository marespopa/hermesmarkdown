import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import type { FileMetadata } from "./metadata";
import { atom_fileMetadata } from "./metadata";
import { atom_privacyLevel } from "./privacy-atoms";
import {
  atom_allTaskTags,
  atom_allTasks,
  atom_filteredTasks,
  atom_taskSearchQuery,
  atom_taskTagFilter,
  atom_visibleTasks,
} from "./task-atoms";
import type { TaskItem } from "../utils/taskExtractor";
import { MASKED_TEXT, type PrivacyLevel } from "../utils/note-display";

function task(path: string, text: string, tags: string[]): TaskItem {
  return {
    id: `${path}#1`, path, line: 1, checked: false, inProgress: false, onHold: false,
    dueDate: null, priority: null, tags, text, raw: `- [ ] ${text}`, lineHash: "h",
  };
}

function file(path: string, tasks: TaskItem[], frontmatter: Record<string, string> = {}): FileMetadata {
  return { path, name: path, tags: [], links: [], frontmatter, modifiedAt: 1, wordCount: 0, tasks, handle: null };
}

function storeWith(level: PrivacyLevel) {
  const store = createStore();
  store.set(atom_fileMetadata, {
    "plain.md": file("plain.md", [task("plain.md", "Buy milk", ["home"])]),
    "secret.md": file("secret.md", [task("secret.md", "Wire the secret payment", ["money"])], { sensitive: "true" }),
  });
  store.set(atom_privacyLevel, level);
  return store;
}

describe("atom_visibleTasks", () => {
  it("masks tasks from sensitive notes in show_title and blurred", () => {
    for (const level of ["show_title", "blurred"] as const) {
      const tasks = storeWith(level).get(atom_visibleTasks);
      const masked = tasks.find((t) => t.path === "secret.md");
      expect(masked).toMatchObject({ text: MASKED_TEXT, tags: [], isMasked: true });
      expect(tasks.find((t) => t.path === "plain.md")).toMatchObject({ text: "Buy milk", isMasked: false });
    }
  });

  it("leaves tasks from sensitive notes out in hidden", () => {
    const store = storeWith("hidden");
    expect(store.get(atom_visibleTasks).map((t) => t.path)).toEqual(["plain.md"]);
    // The raw list is untouched (writeback relies on it).
    expect(store.get(atom_allTasks)).toHaveLength(2);
  });

  it("keeps masked tasks' tags out of the tag list", () => {
    expect(storeWith("show_title").get(atom_allTaskTags)).toEqual(["home"]);
  });

  it("never matches a masked task by text or tag filter", () => {
    const store = storeWith("show_title");
    expect(store.get(atom_filteredTasks)).toHaveLength(2);

    store.set(atom_taskSearchQuery, "secret");
    expect(store.get(atom_filteredTasks)).toHaveLength(0);
    store.set(atom_taskSearchQuery, "•");
    expect(store.get(atom_filteredTasks)).toHaveLength(0);

    store.set(atom_taskSearchQuery, "");
    store.set(atom_taskTagFilter, ["money"]);
    expect(store.get(atom_filteredTasks)).toHaveLength(0);
  });
});

describe("template files", () => {
  it("keeps tasks from the templates folder out of the task lists", () => {
    const store = createStore();
    store.set(atom_fileMetadata, {
      "plain.md": file("plain.md", [task("plain.md", "Buy milk", [])]),
      "templates/rfc.md": file("templates/rfc.md", [task("templates/rfc.md", "{{prompt:Task}}", [])]),
      "templates/old/x.md": file("templates/old/x.md", [task("templates/old/x.md", "Nested", [])]),
    });
    expect(store.get(atom_allTasks).map((t) => t.text)).toEqual(["Buy milk", "Nested"]);
    expect(store.get(atom_visibleTasks).map((t) => t.text)).toEqual(["Buy milk", "Nested"]);
  });
});
