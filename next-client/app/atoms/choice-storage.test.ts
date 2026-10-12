import { createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { atomWithChoiceStorage, normalizeChoice } from "./choice-storage";
import { atom_autosaveMode, atom_focusMode } from "./ui-atoms";

const CHOICES = ["one", "two"] as const;

describe("normalizeChoice", () => {
  it("keeps a known value and falls back for anything else", () => {
    expect(normalizeChoice("two", CHOICES, "one")).toBe("two");
    expect(normalizeChoice("three", CHOICES, "one")).toBe("one");
    expect(normalizeChoice(undefined, CHOICES, "one")).toBe("one");
  });
});

describe("atomWithChoiceStorage", () => {
  beforeEach(() => localStorage.clear());

  it("reads an unknown stored value as the fallback", () => {
    localStorage.setItem("choiceTest", JSON.stringify("retired"));
    const store = createStore();
    const choice = atomWithChoiceStorage("choiceTest", CHOICES, "one");
    // Mounting reads the stored value, like a component using the atom.
    store.sub(choice, () => {});
    expect(store.get(choice)).toBe("one");
  });

  it("reads a known stored value and persists writes", () => {
    localStorage.setItem("choiceTest", JSON.stringify("two"));
    const store = createStore();
    const choice = atomWithChoiceStorage("choiceTest", CHOICES, "one");
    store.sub(choice, () => {});
    expect(store.get(choice)).toBe("two");

    store.set(choice, (current) => (current === "two" ? "one" : "two"));
    expect(store.get(choice)).toBe("one");
    expect(JSON.parse(localStorage.getItem("choiceTest")!)).toBe("one");
  });
});

describe("settings stored by older versions", () => {
  beforeEach(() => localStorage.clear());

  it("reads the retired On Focus Change autosave mode as After Delay", () => {
    localStorage.setItem("autosaveMode", JSON.stringify("onFocusChange"));
    const store = createStore();
    store.sub(atom_autosaveMode, () => {});
    expect(store.get(atom_autosaveMode)).toBe("afterDelay");
  });

  it("starts Focus at Hide interface while typing, and reads an unknown level as that", () => {
    expect(createStore().get(atom_focusMode)).toBe("hide");
    localStorage.setItem("focusMode", JSON.stringify("typewriter"));
    const store = createStore();
    store.sub(atom_focusMode, () => {});
    expect(store.get(atom_focusMode)).toBe("hide");
  });
});
