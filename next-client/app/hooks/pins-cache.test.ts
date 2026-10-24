import { beforeEach, describe, expect, it } from "vitest";
import { cachePins, PINS_CACHE_KEY, readCachedPins } from "./pins-cache";

describe("pins cache", () => {
  beforeEach(() => localStorage.clear());

  it("keeps each vault's pins, and knows a vault it hasn't seen", () => {
    expect(readCachedPins("local:Notes")).toBeNull();
    cachePins("local:Notes", [{ kind: "tag", target: "release", icon: "🚀" }, { kind: "page", target: "tasks", icon: null }]);
    cachePins("local:Archive", []);
    expect(readCachedPins("local:Notes")).toEqual([{ kind: "tag", target: "release", icon: "🚀" }, { kind: "page", target: "tasks", icon: null }]);
    expect(readCachedPins("local:Archive")).toEqual([]);
  });

  it("drops anything odd", () => {
    localStorage.setItem(PINS_CACHE_KEY, JSON.stringify({ "local:Notes": [{ kind: "tag", target: "bug" }, { kind: "widget" }, null, "x"] }));
    expect(readCachedPins("local:Notes")).toEqual([{ kind: "tag", target: "bug", icon: null }]);
    localStorage.setItem(PINS_CACHE_KEY, "{not json");
    expect(readCachedPins("local:Notes")).toBeNull();
  });
});
