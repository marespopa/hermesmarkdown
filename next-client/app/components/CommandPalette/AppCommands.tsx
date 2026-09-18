"use client";

import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_keyboardShortcutsOpen, atom_theme } from "@/app/atoms/ui-atoms";
import { useRegisterCommand } from "./CommandPaletteContext";

export default function AppCommands() {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useAtom(atom_theme);
  const [, setKeyboardShortcutsOpen] = useAtom(atom_keyboardShortcutsOpen);

  useRegisterCommand(
    pathname === "/editor"
      ? null
      : {
          id: "go-home",
          label: "Go to home",
          description: "Open the HermesMarkdown home page",
          category: "Navigation",
          keywords: "home start landing",
          disabledReason: pathname === "/" ? "Already on home" : undefined,
          action: () => router.push("/"),
        },
  );

  useRegisterCommand({
    id: "go-editor",
    label: "Open Editor",
    description: "Return to the Markdown editor",
    category: "Navigation",
    keywords: "write notes vault",
    disabledReason: pathname === "/editor" ? "Already in editor" : undefined,
    action: () => router.push("/editor"),
  });

  useRegisterCommand(
    pathname === "/editor"
      ? null
      : {
          id: "open-documentation",
          label: "Open Documentation",
          category: "Help",
          keywords: "docs help guide",
          disabledReason: pathname === "/documentation" ? "Already viewing documentation" : undefined,
          action: () => router.push("/documentation"),
        },
  );

  useRegisterCommand({
    id: "open-settings",
    label: "Open Settings",
    category: "Settings",
    keywords: "preferences configuration",
    disabledReason: pathname === "/editor/settings" ? "Already in settings" : undefined,
    action: () => router.push("/editor/settings"),
  });

  useRegisterCommand({
    id: "toggle-theme",
    label: `Theme: switch from ${theme}`,
    category: "Settings",
    keywords: "appearance system dark light",
    action: () => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system"),
  });

  useRegisterCommand({
    id: "show-keyboard-shortcuts",
    label: "Show keyboard shortcuts",
    category: "Help",
    keywords: "hotkeys keybindings help",
    action: () => setKeyboardShortcutsOpen(true),
  });

  return null;
}
