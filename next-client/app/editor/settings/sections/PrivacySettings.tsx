"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { normalizePrivacyLevel, type PrivacyLevel } from "@/app/utils/note-display";
import { SegmentedControl, SettingGroup, SettingItem } from "../components/SettingControls";

const PRIVACY_OPTIONS: { label: string; value: PrivacyLevel }[] = [
  { label: "Show titles", value: "show_title" },
  { label: "Blur previews", value: "blurred" },
  { label: "Hide notes", value: "hidden" },
];

// Settings → Privacy: how sensitive notes appear in the home feed, the
// command palette and the Tasks page.
export default function PrivacySettings() {
  const [privacyLevel, setPrivacyLevel] = useAtom(atom_privacyLevel);

  return (
    <SettingGroup title="Privacy">
      <SettingItem
        label="Privacy Mode"
        description="How sensitive notes appear in the home feed, search and tasks. Mark a note with sensitive: true or a private tag in its frontmatter."
        layout="stack"
        control={
          <SegmentedControl
            options={PRIVACY_OPTIONS}
            value={normalizePrivacyLevel(privacyLevel)}
            onChange={setPrivacyLevel}
          />
        }
      />
    </SettingGroup>
  );
}
