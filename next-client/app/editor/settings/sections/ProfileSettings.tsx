"use client";

import React from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  atom_commandUseCounts,
  atom_palettePinnedItems,
  atom_recentCommandIds,
  atom_recentFilePaths,
  atom_userName,
} from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
import { showSuccessToast } from "@/app/components/Toastr";
import { useDialog } from "@/app/hooks/use-dialog";
import { SettingGroup, SettingItem } from "../components/SettingControls";

// The Settings → Profile section: the name first asked for in the Welcome
// wizard (trimmed on blur like the wizard does), a note on where data lives,
// and clearing the command palette's history.
export default function ProfileSettings() {
  const [userName, setUserName] = useAtom(atom_userName);
  const setRecentCommandIds = useSetAtom(atom_recentCommandIds);
  const setRecentFilePaths = useSetAtom(atom_recentFilePaths);
  const setCommandUseCounts = useSetAtom(atom_commandUseCounts);
  const setPalettePinnedItems = useSetAtom(atom_palettePinnedItems);
  const dialog = useDialog();

  const clearCommandHistory = async () => {
    const confirmed = await dialog.confirm(
      "Clear recent commands, recent files, usage counts, and pinned items from the command palette?",
      "Clear Command History",
      "Clear",
    );
    if (!confirmed) return;
    setRecentCommandIds([]);
    setRecentFilePaths([]);
    setCommandUseCounts({});
    setPalettePinnedItems([]);
    showSuccessToast("Command history cleared");
  };

  return (
    <>
      <SettingGroup title="Profile">
        <SettingItem
          label="Your Name"
          description="Used to greet you on the home feed. Leave empty for a generic greeting."
          control={
            <BareInput
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={() => setUserName(userName.trim())}
              placeholder="Your name"
              aria-label="Your name"
              maxLength={60}
              className="h-8 w-44 rounded-lg border border-edge bg-input-bg px-2 text-ui-footnote text-fg outline-none placeholder:text-fg-faint focus:ring-4 focus:ring-sage/10"
            />
          }
        />
      </SettingGroup>
      <SettingGroup title="Your Data">
        <SettingItem
          label="Stored on This Device"
          description="There's no account. Your name, settings, and AI keys are saved in this browser only, and your notes stay in your vault."
          control={null}
        />
        <SettingItem
          label="Command History"
          description="Recent commands, recent files, and pinned items in the command palette."
          control={
            <Button variant="warning" onClick={clearCommandHistory} className="h-8 px-4 text-ui-footnote font-medium">
              Clear
            </Button>
          }
        />
      </SettingGroup>
    </>
  );
}
