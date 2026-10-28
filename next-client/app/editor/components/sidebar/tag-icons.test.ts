import { describe, expect, it } from "vitest";
import { LuBookOpen, LuBriefcase } from "react-icons/lu";
import { parseTagIcons } from "./tag-icons";

describe("parseTagIcons", () => {
  it("maps tags to icons by name, however the name or tag is spelled", () => {
    const icons = parseTagIcons(JSON.stringify({ Journal: "BookOpen", "#work/projects": "briefcase" }));
    expect(icons.journal).toBe(LuBookOpen);
    expect(icons["work/projects"]).toBe(LuBriefcase);
  });

  it("leaves out unknown icon names and non-string values", () => {
    expect(parseTagIcons(JSON.stringify({ a: "NoSuchIcon", b: 3, c: null }))).toEqual({});
  });

  it("gives none for text that isn't an object of names", () => {
    expect(parseTagIcons("not json")).toEqual({});
    expect(parseTagIcons("[]")).toEqual({});
    expect(parseTagIcons("null")).toEqual({});
  });
});
