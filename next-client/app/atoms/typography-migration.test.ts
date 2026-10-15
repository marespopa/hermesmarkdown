import { beforeEach, describe, expect, it } from "vitest";
import {
  DUOSPACE_FONT_STACK,
  MONO_FONT_STACK,
  QUATTRO_FONT_STACK,
  UI_FONT_STACK,
  migrateLegacyTypographyPreferences,
} from "./ui-atoms";

const save = (key: string, value: string) => window.localStorage.setItem(key, JSON.stringify(value));
const saved = (key: string) => JSON.parse(window.localStorage.getItem(key) ?? "null");

describe("migrateLegacyTypographyPreferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("moves a saved Inter writing font to Quattro", () => {
    save("editorFontFamily", UI_FONT_STACK);
    migrateLegacyTypographyPreferences();
    expect(saved("editorFontFamily")).toBe(QUATTRO_FONT_STACK);
  });

  it("moves retired sans writing fonts to Quattro", () => {
    save("editorFontFamily", "var(--font-plus-jakarta), sans-serif");
    migrateLegacyTypographyPreferences();
    expect(saved("editorFontFamily")).toBe(QUATTRO_FONT_STACK);
  });

  it("keeps Inter as the reading font", () => {
    save("renderedFontFamily", "var(--font-source-serif), serif");
    migrateLegacyTypographyPreferences();
    expect(saved("renderedFontFamily")).toBe(UI_FONT_STACK);
  });

  it("leaves current writing fonts as they are", () => {
    for (const stack of [MONO_FONT_STACK, DUOSPACE_FONT_STACK, QUATTRO_FONT_STACK]) {
      save("editorFontFamily", stack);
      migrateLegacyTypographyPreferences();
      expect(saved("editorFontFamily")).toBe(stack);
    }
  });
});
