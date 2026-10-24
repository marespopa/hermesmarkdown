import React from "react";
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_pinsState } from "@/app/atoms/pin-atoms";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { atom_filesRevealPath, atom_indexerState } from "@/app/atoms/ui-atoms";
import { atom_vaultFolderPaths } from "@/app/atoms/vault-atoms";
import type { Pin, PinsDocument } from "@/app/services/vault-pins-format";
import { announcePinTouchDrag, PIN_DRAG_TYPE } from "../../utils/pin-drag";
import SidebarPinned from "./SidebarPinned";

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/editor", search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const openFile = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ openFile }) }));

const showErrorToast = vi.hoisted(() => vi.fn());
vi.mock("@/app/components/Toastr", () => ({ showErrorToast }));

// The writer: applies each edit to a file holding the pins on screen.
const writes = vi.hoisted(() => ({ edits: [] as unknown[], current: [] as Pin[] }));
vi.mock("@/app/services/vault-pins", async () => {
  const format = await import("@/app/services/vault-pins-format");
  return {
    PinsFileInvalidError: class extends Error {},
    PinsFileNewerError: class extends Error {},
    updatePinsFile: vi.fn(async (_vault: unknown, edit: (doc: PinsDocument, pins: Pin[]) => PinsDocument | null) => {
      writes.edits.push(edit);
      const pins = writes.current;
      const doc: PinsDocument = { root: {}, items: pins.map((pin) => ({ [pin.kind]: pin.target, ...(pin.icon ? { icon: pin.icon } : {}) })) };
      const next = edit(doc, pins);
      return next ? { pins: format.listedPins(next), changed: true } : { pins, changed: false };
    }),
  };
});

const vault = { name: "Notes" } as unknown as FileSystemDirectoryHandle;
const handle = { kind: "file", name: "roadmap.md" };
const meta = (path: string, extra: Partial<FileMetadata> = {}): FileMetadata => ({
  path, name: path.split("/").pop()!, tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 2, tasks: [], handle: handle as never, ...extra,
});

const pins: Pin[] = [
  { kind: "note", target: "projects/roadmap.md", icon: "🚀" },
  { kind: "folder", target: "projects", icon: null },
  { kind: "tag", target: "release", icon: null },
  { kind: "page", target: "tasks", icon: null },
];

function setup({ pinned = pins, activePath = null as string | null, metadata = { "projects/roadmap.md": meta("projects/roadmap.md") } as Record<string, FileMetadata> } = {}) {
  const store = createStore();
  store.set(atom_pinsState, { vault, status: "ok", pins: pinned });
  store.set(atom_fileMetadata, metadata);
  store.set(atom_vaultFolderPaths, ["projects"]);
  writes.current = pinned;
  render(<Provider store={store}><SidebarPinned activePath={activePath} /></Provider>);
  return store;
}

const rows = () => within(screen.getByRole("list", { name: "Pinned" })).getAllByRole("listitem");
const rowButton = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}$`) });
const targets = (store: ReturnType<typeof createStore>) => store.get(atom_pinsState).pins.map((pin) => pin.target);
// The drop target: the box around the whole section.
const section = () => screen.getByRole("region", { name: "Pinned" }).parentElement as HTMLElement;

// A row's text without its shortcut badge.
const rowText = (row: HTMLElement) => row.textContent!.replace(row.querySelector("kbd")?.textContent ?? "", "");
const listItem = (name: string) => rowButton(name).closest("[role=listitem]") as HTMLElement;

// jsdom lays nothing out: each row 28px tall, one under the other from 0.
function layOutRows() {
  rows().forEach((row, index) => {
    vi.spyOn(row, "getBoundingClientRect").mockReturnValue({ top: index * 28, height: 28 } as DOMRect);
  });
}

// jsdom has no DragEvent, so fireEvent drops clientY: define it.
function dragAt(type: "dragOver" | "drop", element: HTMLElement, dataTransfer: object, clientY: number) {
  const event = createEvent[type](element, { dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY });
  fireEvent(element, event);
}

const pinTransfer = (payload: object[]) => ({
  types: [PIN_DRAG_TYPE],
  getData: (type: string) => (type === PIN_DRAG_TYPE ? JSON.stringify(payload) : ""),
  dropEffect: "",
});

describe("SidebarPinned", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    writes.edits = [];
    navigation.pathname = "/editor";
    navigation.search = "";
    window.history.replaceState(null, "", "/editor");
  });

  it("lists every kind in file order, each with its emoji or its default glyph", () => {
    setup();
    expect(rows().map(rowText)).toEqual(["🚀roadmap", "projects", "##release", "Tasks"]);
    const [note, folder] = rows();
    expect(within(note).getByText("🚀")).toHaveAttribute("aria-hidden", "true");
    expect(folder.querySelector("svg")).not.toBeNull();
    expect(rowButton("roadmap")).toHaveAttribute("title", "projects/roadmap.md");
  });

  it("opens a note, reveals a folder in Files and opens a page", async () => {
    const store = setup();
    fireEvent.click(rowButton("roadmap"));
    await waitFor(() => expect(openFile).toHaveBeenCalledWith(handle, "projects/roadmap.md"));

    fireEvent.click(rowButton("projects"));
    expect(store.get(atom_filesRevealPath)).toBe("projects");

    fireEvent.click(rowButton("Tasks"));
    expect(navigation.push).toHaveBeenCalledWith("/editor/tasks");
  });

  it("opens a tag's page, or picks it in place on the Tags page", () => {
    setup();
    fireEvent.click(rowButton("#release"));
    expect(navigation.push).toHaveBeenCalledWith("/editor/tags?tag=release");

    cleanup();
    navigation.push.mockClear();
    navigation.pathname = "/editor/tags";
    window.history.replaceState(null, "", "/editor/tags");
    setup();
    fireEvent.click(rowButton("#release"));
    expect(navigation.push).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?tag=release");
  });

  it("marks the current note, tag and page", () => {
    setup({ activePath: "projects/roadmap.md" });
    expect(rowButton("roadmap")).toHaveAttribute("aria-current", "page");
    expect(rowButton("#release")).not.toHaveAttribute("aria-current");

    cleanup();
    navigation.pathname = "/editor/tags";
    navigation.search = "tag=release";
    setup({ pinned: [...pins, { kind: "page", target: "tags", icon: null }] });
    expect(rowButton("#release")).toHaveAttribute("aria-current", "page");
    expect(rowButton("Tags")).not.toHaveAttribute("aria-current");
    expect(rowButton("projects")).not.toHaveAttribute("aria-current");
  });

  it("sets the icon and unpins from the row's menu", async () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "roadmap actions" }));
    expect(screen.getByRole("menuitem", { name: "Change Icon…" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Move Up" })).not.toBeInTheDocument();

    fireEvent.contextMenu(rowButton("projects"));
    expect(screen.getByRole("menuitem", { name: "Set Icon…" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Unpin" }));
    await waitFor(() => expect(targets(store)).toEqual(["projects/roadmap.md", "release", "tasks"]));
    expect(writes.edits).toHaveLength(1);
  });

  it("reorders by dragging a row", async () => {
    const store = setup();
    layOutRows();
    const dataTransfer = { setData: vi.fn(), types: [] as string[], effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(listItem("roadmap"), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("application/x-hermes-pin", "note:projects/roadmap.md");
    dragAt("dragOver", listItem("Tasks"), dataTransfer, 100);
    dragAt("drop", listItem("Tasks"), dataTransfer, 100);
    await waitFor(() => expect(targets(store)).toEqual(["projects", "release", "tasks", "projects/roadmap.md"]));
  });

  it("pins notes and folders dragged in from Files where they drop", async () => {
    const store = setup();
    layOutRows();
    const dataTransfer = pinTransfer([{ kind: "note", target: "notes/launch.md" }, { kind: "folder", target: "projects" }]);
    dragAt("dragOver", listItem("projects"), dataTransfer, 30);
    expect(dataTransfer.dropEffect).toBe("link");
    dragAt("drop", listItem("projects"), dataTransfer, 30);
    await waitFor(() => expect(targets(store)).toEqual(["projects/roadmap.md", "notes/launch.md", "projects", "release", "tasks"]));
  });

  it("takes a drop on the section's title too, pinning at the top", async () => {
    const store = setup();
    layOutRows();
    const title = screen.getByText("Pinned");
    const dataTransfer = pinTransfer([{ kind: "note", target: "notes/launch.md" }]);
    dragAt("dragOver", title, dataTransfer, -10);
    dragAt("drop", title, dataTransfer, -10);
    await waitFor(() => expect(targets(store)).toEqual(["notes/launch.md", "projects/roadmap.md", "projects", "release", "tasks"]));
  });

  it("ignores drags that carry nothing to pin", () => {
    setup();
    const dataTransfer = { types: ["Files"], getData: () => "", dropEffect: "none" };
    fireEvent.dragOver(listItem("Tasks"), { dataTransfer });
    fireEvent.drop(listItem("Tasks"), { dataTransfer });
    expect(dataTransfer.dropEffect).toBe("none");
    expect(writes.edits).toHaveLength(0);
  });

  it("shows a drop zone just after a note starts dragging with nothing pinned, and pins the drop", async () => {
    const store = setup({ pinned: [] });
    const dataTransfer = pinTransfer([{ kind: "note", target: "notes/launch.md" }]);
    fireEvent.dragStart(document.body, { dataTransfer });
    // Not during dragstart itself: moving the page then cancels the drag.
    expect(screen.queryByText("Drop to pin")).not.toBeInTheDocument();
    const zone = await screen.findByText("Drop to pin");
    dragAt("dragOver", zone, dataTransfer, 10);
    dragAt("drop", zone, dataTransfer, 10);
    await waitFor(() => expect(targets(store)).toEqual(["notes/launch.md"]));
    expect(screen.queryByText("Drop to pin")).not.toBeInTheDocument();
  });

  it("hides the drop zone when the drag ends elsewhere", async () => {
    setup({ pinned: [] });
    fireEvent.dragStart(document.body, { dataTransfer: { types: [PIN_DRAG_TYPE] } });
    await screen.findByText("Drop to pin");
    fireEvent.dragEnd(document.body);
    expect(screen.queryByText("Drop to pin")).not.toBeInTheDocument();
  });

  it("pins a note lifted over the section in a touch drag from Files", async () => {
    const store = setup();
    layOutRows();
    const targetsDragged = [{ kind: "note" as const, target: "notes/launch.md" }];
    vi.spyOn(section(), "getBoundingClientRect").mockReturnValue({ left: 0, right: 200, top: 0, bottom: 150 } as DOMRect);
    act(() => announcePinTouchDrag({ phase: "start", x: 10, y: 30, targets: targetsDragged }));
    act(() => announcePinTouchDrag({ phase: "move", x: 10, y: 30, targets: targetsDragged }));
    act(() => announcePinTouchDrag({ phase: "end", x: 10, y: 30, targets: targetsDragged, dropped: true }));
    await waitFor(() => expect(targets(store)).toEqual(["projects/roadmap.md", "notes/launch.md", "projects", "release", "tasks"]));
  });

  it("ignores a touch drag lifted elsewhere or cancelled", () => {
    setup({ pinned: [] });
    const targetsDragged = [{ kind: "note" as const, target: "notes/launch.md" }];
    act(() => announcePinTouchDrag({ phase: "start", x: 10, y: 30, targets: targetsDragged }));
    expect(screen.getByText("Drop to pin")).toBeInTheDocument();
    vi.spyOn(section(), "getBoundingClientRect").mockReturnValue({ left: 0, right: 200, top: 0, bottom: 28 } as DOMRect);
    act(() => announcePinTouchDrag({ phase: "end", x: 10, y: 300, targets: targetsDragged, dropped: true }));
    expect(screen.queryByText("Drop to pin")).not.toBeInTheDocument();
    expect(writes.edits).toHaveLength(0);
  });

  it("opens the pin in each place with Ctrl/Cmd+1–9, showing the key at the row's end", () => {
    setup({ activePath: "projects/roadmap.md" });
    expect(rows().map((row) => row.querySelector("kbd")?.textContent)).toEqual(
      ["1", "2", "3", "4"].map((n) => expect.stringMatching(new RegExp(`^(Ctrl\\+|⌘)${n}$`))),
    );
    expect(rowButton("Tasks")).toHaveAttribute("aria-keyshortcuts", "Control+4 Meta+4");

    fireEvent.keyDown(window, { key: "4", ctrlKey: true });
    expect(navigation.push).toHaveBeenCalledWith("/editor/tasks");
    navigation.push.mockClear();
    fireEvent.keyDown(window, { key: "5", metaKey: true });
    fireEvent.keyDown(window, { key: "4", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "4" });
    // A picker that numbers its own rows handled it first.
    const handled = new KeyboardEvent("keydown", { key: "4", ctrlKey: true, cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("lists at most nine pins", () => {
    const many: Pin[] = Array.from({ length: 11 }, (_, i) => ({ kind: "tag", target: `tag${i + 1}`, icon: null }));
    setup({ pinned: many });
    expect(rows()).toHaveLength(9);
    expect(rowText(rows()[8])).toBe("##tag9");
  });

  it("shows its header at once on a vault's first read, and its cached rows on later ones", () => {
    const store = setup({ pinned: [] });
    act(() => store.set(atom_pinsState, { vault, status: "loading", pins: [], cached: false }));
    expect(screen.getByRole("region", { name: "Pinned" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Pinned" })).not.toBeInTheDocument();

    act(() => store.set(atom_pinsState, { vault, status: "loading", pins: [], cached: true }));
    expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument();
    act(() => store.set(atom_pinsState, { vault, status: "loading", pins: [pins[3]], cached: true }));
    expect(rows().map(rowText)).toEqual(["Tasks"]);
  });

  it("moves a row with Alt+Up and Alt+Down, but not past the ends", async () => {
    const store = setup();
    fireEvent.keyDown(rowButton("roadmap"), { key: "ArrowUp", altKey: true });
    fireEvent.keyDown(rowButton("Tasks"), { key: "ArrowDown", altKey: true });
    expect(writes.edits).toHaveLength(0);

    fireEvent.keyDown(rowButton("roadmap"), { key: "ArrowDown", altKey: true });
    await waitFor(() => expect(targets(store)).toEqual(["projects", "projects/roadmap.md", "release", "tasks"]));

    writes.current = [...store.get(atom_pinsState).pins];
    fireEvent.keyDown(screen.getByRole("button", { name: "Tasks actions" }), { key: "ArrowUp", altKey: true });
    await waitFor(() => expect(targets(store)).toEqual(["projects", "projects/roadmap.md", "tasks", "release"]));
  });

  it("shows a missing note faint once indexing is done, and toasts on click", () => {
    const store = setup({ metadata: {} });
    expect(rowButton("roadmap")).toHaveAttribute("title", "Not found in this vault");
    fireEvent.click(rowButton("roadmap"));
    expect(showErrorToast).toHaveBeenCalledWith("“roadmap” isn't in this vault any more.");
    expect(openFile).not.toHaveBeenCalled();

    act(() => store.set(atom_indexerState, "compiling"));
    expect(rowButton("roadmap")).toHaveAttribute("title", "projects/roadmap.md");
  });

  it("labels a note by its file name, not its title", () => {
    setup({ metadata: { "projects/roadmap.md": meta("projects/roadmap.md", { frontmatter: { title: "Release plan" } }) } });
    expect(rowButton("roadmap")).toBeInTheDocument();
    expect(screen.queryByText("Release plan")).not.toBeInTheDocument();
  });

  it("leaves out a private note in Hide from lists", () => {
    const store = createStore();
    store.set(atom_privacyLevel, "hidden");
    store.set(atom_pinsState, { vault, status: "ok", pins: [pins[0], pins[2]] });
    store.set(atom_fileMetadata, { "projects/roadmap.md": meta("projects/roadmap.md", { frontmatter: { private: "true" } }) });
    render(<Provider store={store}><SidebarPinned activePath={null} /></Provider>);
    expect(rows().map(rowText)).toEqual(["##release"]);
    expect(store.get(atom_pinsState).pins).toHaveLength(2);
  });

  it("renders nothing with nothing pinned", () => {
    setup({ pinned: [] });
    expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument();
  });
});
