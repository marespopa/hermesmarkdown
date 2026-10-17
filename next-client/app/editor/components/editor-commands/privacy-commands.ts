import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { normalizePrivacyLevel, type PrivacyLevel } from "@/app/utils/note-display";
import type { EditorCommandContext } from "./use-editor-command-context";

const KEYWORDS = "privacy private screen share recording mask hide";

const PRIVACY_MODE_COMMANDS: { id: string; label: string; description: string; level: PrivacyLevel }[] = [
  {
    id: "privacy-mode-show-title",
    label: "Privacy mode: Mask in lists",
    description: "List private notes by title with a lock; mask their previews and tasks",
    level: "show_title",
  },
  {
    id: "privacy-mode-hidden",
    label: "Privacy mode: Hide from lists",
    description: "Leave private notes out of pinned notes, quick open and tasks",
    level: "hidden",
  },
];

// Privacy Mode levels (persisted) plus the session-only editor reveal.
export function buildPrivacyCommands(context: EditorCommandContext): Command[] {
  const current = normalizePrivacyLevel(context.privacyLevel);
  const levelCommands: Command[] = PRIVACY_MODE_COMMANDS.map(({ id, label, description, level }) => ({
    id,
    label,
    description,
    category: "Privacy",
    keywords: KEYWORDS,
    disabledReason: level === current ? "Current mode" : undefined,
    action: () => context.setPrivacyLevel(level),
  }));

  const revealAll = context.revealAllPrivate;
  return [
    ...levelCommands,
    {
      id: "reveal-private-session",
      label: revealAll ? "Hide private notes again" : "Show all private notes this session",
      description: revealAll
        ? "Veil private notes in the editor again"
        : "Open private notes without the veil until reload",
      category: "Privacy",
      keywords: `${KEYWORDS} reveal veil unlock`,
      action: () => {
        if (revealAll) {
          // Also forget per-note reveals, so open private notes veil again on their next mount.
          context.setRevealedPrivatePaths(new Set<string>());
          context.setRevealAllPrivate(false);
        } else {
          context.setRevealAllPrivate(true);
        }
      },
    },
  ];
}
