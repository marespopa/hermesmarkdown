import type { Group } from "../doc-primitives";
import { aiFeaturesGroup } from "./ai-features";
import { editorWorkspaceItems } from "./editor-workspace";
import { editorWritingItems } from "./editor-writing";
import { getStartedGroup } from "./get-started";
import { mobileGroup, settingsGroup } from "./settings-mobile";
import { vaultGroup } from "./vault";

// Section order of the /documentation page.
export const GROUPS: Group[] = [
  getStartedGroup,
  { id: "editor", label: "Editor", items: [...editorWritingItems, ...editorWorkspaceItems] },
  vaultGroup,
  aiFeaturesGroup,
  settingsGroup,
  mobileGroup,
];
