import React from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { useChatSkills } from "./use-chat-skills";

function Wrapper({ children }: { children: React.ReactNode }) { return <Provider store={store}>{children}</Provider>; }
const store = createStore();

describe("useChatSkills", () => {
  it("returns slash-skill binding context without changing model-loaded skill instructions", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("skills/audit.md", "---\ntype: skill\ntools: [read_file]\nchecks: [typecheck]\n---\nRead the project carefully.");
    store.set(atom_vaultHandle, vault.asHandle());
    store.set(atom_fileMetadata, { "skills/audit.md": { path: "skills/audit.md", name: "audit.md", tags: [], links: [], frontmatter: { type: "skill", tools: ["read_file"], checks: ["typecheck"] }, modifiedAt: 0, wordCount: 0, tasks: [], handle: null } });
    const { result } = renderHook(() => useChatSkills(), { wrapper: Wrapper });

    expect(await result.current.commandSkill("/audit list source")).toEqual({ command: "/audit", text: "Read the project carefully.", toolBindings: ["read_file"], projectChecks: ["typecheck"] });
    expect(await result.current.loadSkill("/audit")).toBe("Read the project carefully.");
    expect(result.current.skillList().some(({ command }) => command === "/template")).toBe(true);
  });
});
