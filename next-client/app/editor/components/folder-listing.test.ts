// @vitest-environment node
import { describe, expect, it } from "vitest";
import { folderName, listFolder, listingRows, parentOf, searchBelow } from "./folder-listing";

const handle = {} as FileSystemFileHandle;
const file = (path: string) => ({ name: path.split("/").pop()!, path, handle });

const files = [
  file("Inbox.md"),
  file("Projects/Roadmap.md"),
  file("Projects/Launch/Checklist.md"),
  file("Projects/Launch/Pricing.md"),
  file("Archive/2025/Retro.md"),
];
const folderPaths = ["Projects", "Projects/Launch", "Projects/Drafts", "Archive", "Archive/2025"];

describe("listFolder", () => {
  it("lists a folder's subfolders, then its notes, by name and without `.md`", () => {
    expect(listFolder("Projects", files, folderPaths)).toEqual({
      folders: [{ name: "Drafts", path: "Projects/Drafts" }, { name: "Launch", path: "Projects/Launch" }],
      notes: [{ name: "Roadmap", path: "Projects/Roadmap.md", handle }],
    });
  });

  it("lists the vault's root", () => {
    const root = listFolder("", files, folderPaths);
    expect(root.folders.map((f) => f.path)).toEqual(["Archive", "Projects"]);
    expect(root.notes.map((n) => n.path)).toEqual(["Inbox.md"]);
  });

  it("keeps empty folders, and finds folders the folder list doesn't have yet", () => {
    expect(listFolder("Projects/Drafts", files, folderPaths)).toEqual({ folders: [], notes: [] });
    expect(listFolder("", files, []).folders.map((f) => f.path)).toEqual(["Archive", "Projects"]);
  });

  it("doesn't take a folder whose name only starts the same", () => {
    const listing = listFolder("Projects", [file("Projects 2/Plan.md")], ["Projects 2"]);
    expect(listing).toEqual({ folders: [], notes: [] });
  });
});

describe("searchBelow", () => {
  const names = (folder: string, query: string) => searchBelow(folder, files, folderPaths, query).map((row) => row.name);

  it("finds notes and folders anywhere below the folder, naming every typed word, ignoring case", () => {
    expect(names("", "PRI")).toEqual(["Pricing"]);
    expect(names("", "la ch")).toEqual(["Launch"]);
    expect(names("Archive", "o")).toEqual(["Retro"]);
    expect(names("", "  ")).toEqual([]);
  });

  it("puts names that start with the query first, then folders before notes", () => {
    const rows = searchBelow("", [...files, file("Projects/Plan.md")], folderPaths, "p");
    expect(rows.map((row) => row.name)).toEqual(["Projects", "Plan", "Pricing", "Roadmap"]);
  });

  it("says where each match is, below the searched folder", () => {
    const rows = searchBelow("Projects", files, folderPaths, "i");
    expect(rows.map((row) => [row.name, row.where])).toEqual([
      ["Checklist", "Launch"],
      ["Pricing", "Launch"],
    ]);
  });

  it("finds folders only the notes' paths name, and nothing outside the folder", () => {
    expect(searchBelow("", files, [], "2025")).toEqual([{ kind: "folder", name: "2025", path: "Archive/2025", where: "Archive" }]);
    expect(names("Projects", "retro")).toEqual([]);
  });
});

describe("listingRows", () => {
  it("lists subfolders, then notes", () => {
    expect(listingRows(listFolder("Projects", files, folderPaths)).map((row) => `${row.kind}:${row.name}`)).toEqual([
      "folder:Drafts", "folder:Launch", "note:Roadmap",
    ]);
  });
});

describe("folder paths", () => {
  it("names a folder and its parent", () => {
    expect(parentOf("Projects/Launch")).toBe("Projects");
    expect(parentOf("Projects")).toBe("");
    expect(folderName("Projects/Launch", "Vault")).toBe("Launch");
    expect(folderName("", "Vault")).toBe("Vault");
  });
});
