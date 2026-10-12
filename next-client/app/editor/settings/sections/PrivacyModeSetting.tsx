"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { normalizePrivacyLevel, type PrivacyLevel } from "@/app/utils/note-display";
import { SegmentedControl, SettingGroup, SettingItem } from "../components/SettingControls";

const PRIVACY_OPTIONS: { label: string; value: PrivacyLevel }[] = [
  { label: "Mask in lists", value: "show_title" },
  { label: "Hide from lists", value: "hidden" },
];

// Settings → Files → Privacy: how private notes appear in the home feed, the
// command palette's quick open and the Tasks page.
export default function PrivacyModeSetting() {
  const [privacyLevel, setPrivacyLevel] = useAtom(atom_privacyLevel);

  return (
    <SettingGroup title="Privacy">
      <SettingItem
        label="Privacy Mode"
        description="How private notes appear in the home feed, quick open and Tasks: masked (title and a lock, no preview or task text) or left out. A note is private when its frontmatter has private: true or a private tag. Files and tabs still show file names."
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
