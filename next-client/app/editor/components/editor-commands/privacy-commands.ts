import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { normalizePrivacyLevel, type PrivacyLevel } from "@/app/utils/note-display";
import type { EditorCommandContext } from "./use-editor-command-context";

const KEYWORDS = "privacy sensitive private screen share recording mask";

const PRIVACY_MODE_COMMANDS: { id: string; label: string; description: string; level: PrivacyLevel }[] = [
  {
    id: "privacy-mode-show-title",
    label: "Privacy mode: Show titles only",
    description: "Show sensitive notes by title with a lock; mask their previews",
    level: "show_title",
  },
  {
    id: "privacy-mode-blurred",
    label: "Privacy mode: Blur previews",
    description: "Blur sensitive note previews until hovered or focused",
    level: "blurred",
  },
  {
    id: "privacy-mode-hidden",
    label: "Privacy mode: Hide sensitive notes",
    description: "Leave sensitive notes out of the home feed, search and tasks",
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

  const revealAll = context.revealAllSensitive;
  return [
    ...levelCommands,
    {
      id: "reveal-sensitive-session",
      label: revealAll ? "Hide sensitive notes again" : "Show all sensitive notes this session",
      description: revealAll
        ? "Veil sensitive notes in the editor again"
        : "Open sensitive notes without the veil until reload",
      category: "Privacy",
      keywords: `${KEYWORDS} reveal veil unlock`,
      action: () => {
        if (revealAll) {
          // Also forget per-note reveals, so open sensitive notes veil again on their next mount.
          context.setRevealedSensitivePaths(new Set<string>());
          context.setRevealAllSensitive(false);
        } else {
          context.setRevealAllSensitive(true);
        }
      },
    },
  ];
}
