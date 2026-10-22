// @vitest-environment node
import { describe, expect, it } from "vitest";
import { filterListing, folderName, listFolder, parentOf } from "./folder-listing";

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

describe("filterListing", () => {
  it("keeps the rows naming every typed word, ignoring case", () => {
    const listing = listFolder("Projects/Launch", files, folderPaths);
    expect(filterListing(listing, "PRI").notes.map((n) => n.name)).toEqual(["Pricing"]);
    expect(filterListing(listing, "  ")).toBe(listing);
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
