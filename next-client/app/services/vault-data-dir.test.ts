import { describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "./memory-file-system.test-utils";
import { migrateVaultDataDir } from "./vault-data-dir";

async function vaultWith(paths: string[]) {
  const vault = new MemoryDirectoryHandle("vault");
  for (const path of paths) await vault.writeText(path, path);
  return vault;
}

describe("migrateVaultDataDir", () => {
  it("moves the pins, the Trash and the app's skills to .hermesmarkdown and removes the emptied .hermes", async () => {
    const vault = await vaultWith([
      ".hermes/pins.yaml",
      ".hermes/trash/2026-10-01T00-00-00-000Z-0/old.md",
      ".hermes/skills/tasks.md",
      "note.md",
    ]);
    await migrateVaultDataDir(vault.asHandle());
    expect(vault.listPaths()).toEqual([
      ".hermesmarkdown/pins.yaml",
      ".hermesmarkdown/skills/tasks.md",
      ".hermesmarkdown/trash/2026-10-01T00-00-00-000Z-0/old.md",
      "note.md",
    ]);
    expect(await vault.fileAt(".hermesmarkdown/pins.yaml")!.getFile().then((file) => file.text())).toBe(".hermes/pins.yaml");
  });

  it("leaves other tools' files in .hermes, and keeps what .hermesmarkdown already has", async () => {
    const vault = await vaultWith([".hermes/pins.yaml", ".hermes/skills/agent.md", ".hermes/config.yaml", ".hermesmarkdown/pins.yaml"]);
    await migrateVaultDataDir(vault.asHandle());
    expect(vault.listPaths()).toEqual([".hermes/config.yaml", ".hermes/pins.yaml", ".hermes/skills/agent.md", ".hermesmarkdown/pins.yaml"]);
    expect(await vault.fileAt(".hermesmarkdown/pins.yaml")!.getFile().then((file) => file.text())).toBe(".hermesmarkdown/pins.yaml");
  });

  it("does nothing without a .hermes folder", async () => {
    const vault = await vaultWith(["note.md"]);
    await migrateVaultDataDir(vault.asHandle());
    expect(vault.listPaths()).toEqual(["note.md"]);
  });
});
