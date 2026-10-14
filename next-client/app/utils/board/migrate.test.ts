// @vitest-environment node
import { describe, expect, it } from "vitest";
import { migrateBoard } from "./migrate";

describe("migrateBoard", () => {
  it("keeps a v1 scene as it is", () => {
    const raw = { type: "hermes-board", version: 1, appState: { gridModeEnabled: true }, files: {}, elements: [{ id: "a", type: "text" }] };
    expect(migrateBoard(raw)).toEqual({ appState: { gridModeEnabled: true }, files: {}, elements: [{ id: "a", type: "text" }] });
  });

  it("fills a missing appState and files", () => {
    expect(migrateBoard({ type: "hermes-board", version: 1, elements: [] })).toEqual({ appState: {}, files: {}, elements: [] });
  });

  it("rejects the wrong type, missing elements and unknown versions", () => {
    expect(migrateBoard({ type: "other", version: 1, elements: [] })).toBeNull();
    expect(migrateBoard({ type: "hermes-board", version: 1 })).toBeNull();
    expect(migrateBoard({ type: "hermes-board", version: 2, elements: [] })).toBeNull();
    expect(migrateBoard(null)).toBeNull();
    expect(migrateBoard([])).toBeNull();
  });
});
