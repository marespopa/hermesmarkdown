import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryDirectoryHandle } from "./memory-file-system.test-utils";
import { addPins, removePin } from "./vault-pins-format";
import { PinsFileInvalidError, PinsFileNewerError, readPinsFile, updatePinsFile } from "./vault-pins";

const pinTag = (target: string) => (doc: Parameters<typeof addPins>[0]) => addPins(doc, [{ kind: "tag", target }]);

describe("vault pins file", () => {
  let vault: MemoryDirectoryHandle;

  beforeEach(() => {
    vault = new MemoryDirectoryHandle("vault");
  });

  it("reads nothing without .hermesmarkdown or without the file", async () => {
    expect(await readPinsFile(vault.asHandle())).toBeNull();
    await vault.writeText(".hermesmarkdown/trash/old.md", "gone");
    expect(await readPinsFile(vault.asHandle())).toBeNull();
  });

  it("reads the file's text", async () => {
    await vault.writeText(".hermesmarkdown/pins.yaml", "pins:\n  - {tag: bug}\n");
    expect((await readPinsFile(vault.asHandle()))?.text).toBe("pins:\n  - {tag: bug}\n");
  });

  it("creates .hermesmarkdown/ and pins.yaml on the first write", async () => {
    const result = await updatePinsFile(vault.asHandle(), pinTag("release"));
    expect(result).toEqual({ changed: true, pins: [{ kind: "tag", target: "release", icon: null }] });
    const text = vault.fileAt(".hermesmarkdown/pins.yaml")!.text();
    expect(text).toMatch(/^# Pinned items/);
    expect(text).toContain("version: 1\npins:\n  - {tag: release}\n");
  });

  it("reads the file fresh on every write", async () => {
    await updatePinsFile(vault.asHandle(), pinTag("release"));
    // Edited on another device in between.
    await vault.writeText(".hermesmarkdown/pins.yaml", "pins:\n  - {page: tasks}\n  - {tag: release}\n");
    const result = await updatePinsFile(vault.asHandle(), pinTag("bug"));
    expect(result.pins.map((pin) => pin.target)).toEqual(["tasks", "release", "bug"]);
  });

  it("refuses an invalid file and a newer one, writing nothing", async () => {
    const broken = "pins: [\n  {tag: bug\n";
    await vault.writeText(".hermesmarkdown/pins.yaml", broken);
    await expect(updatePinsFile(vault.asHandle(), pinTag("release"))).rejects.toBeInstanceOf(PinsFileInvalidError);
    expect(vault.fileAt(".hermesmarkdown/pins.yaml")!.text()).toBe(broken);

    const newer = "version: 2\npins:\n  - {tag: bug}\n";
    await vault.writeText(".hermesmarkdown/pins.yaml", newer);
    await expect(updatePinsFile(vault.asHandle(), pinTag("release"))).rejects.toBeInstanceOf(PinsFileNewerError);
    expect(vault.fileAt(".hermesmarkdown/pins.yaml")!.text()).toBe(newer);
  });

  it("doesn't write when the edit changes nothing", async () => {
    const result = await updatePinsFile(vault.asHandle(), (doc) => removePin(doc, "tag:bug"));
    expect(result).toEqual({ changed: false, pins: [] });
    expect(vault.listPaths()).toEqual([]);
  });

  it("lands two concurrent writes", async () => {
    await Promise.all([
      updatePinsFile(vault.asHandle(), pinTag("release")),
      updatePinsFile(vault.asHandle(), pinTag("bug")),
    ]);
    const result = await updatePinsFile(vault.asHandle(), () => null);
    expect(result.pins.map((pin) => pin.target)).toEqual(["release", "bug"]);
  });

  it("keeps going after a failed write", async () => {
    await vault.writeText(".hermesmarkdown/pins.yaml", "pins: [");
    await expect(updatePinsFile(vault.asHandle(), pinTag("release"))).rejects.toBeInstanceOf(PinsFileInvalidError);
    await vault.writeText(".hermesmarkdown/pins.yaml", "pins: []");
    await expect(updatePinsFile(vault.asHandle(), pinTag("release"))).resolves.toMatchObject({ changed: true });
  });

  it("closes the writable when the write throws", async () => {
    const close = vi.fn(async () => {});
    const file = {
      kind: "file",
      name: "pins.yaml",
      getFile: async () => ({ text: async () => "pins: []\n" }),
      createWritable: async () => ({ write: async () => { throw new Error("disk full"); }, close }),
    };
    const hermes = { kind: "directory", name: ".hermesmarkdown", getFileHandle: async () => file, getDirectoryHandle: async () => { throw new DOMException("missing", "NotFoundError"); } };
    const fakeVault = { kind: "directory", name: "vault", getDirectoryHandle: async () => hermes } as unknown as FileSystemDirectoryHandle;

    await expect(updatePinsFile(fakeVault, pinTag("release"))).rejects.toThrow("disk full");
    expect(close).toHaveBeenCalled();
  });
});
