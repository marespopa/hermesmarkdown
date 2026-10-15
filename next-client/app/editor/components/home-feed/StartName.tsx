"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { atom_userName } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { StartGroup } from "./StartGroup";

// Read straight from storage: the stored atom starts empty for a moment,
// which would flash the field for someone who already gave a name.
function hasStoredName() {
  try {
    const stored = window.localStorage.getItem("userName");
    return !!stored && !!JSON.parse(stored)?.trim?.();
  } catch {
    return false;
  }
}

// "What should we call you?" on the no-vault start, until a name is given.
// Asked as the card's caption, over the app's standard text field (Input:
// bordered, filled, focus ring) and a Save button enabled once there's a
// name, so it reads as a question to answer, not a setting. Save, Enter or leaving the field saves it (Settings →
// Profile changes it later); the greeting above picks it up and the card
// goes away.
export default function StartName() {
  const [userName, setUserName] = useAtom(atom_userName);
  const [draft, setDraft] = useState("");
  if (userName.trim() || hasStoredName()) return null;

  const save = () => {
    if (draft.trim()) setUserName(draft.trim());
  };

  return (
    <StartGroup title="What should we call you?" footer="Used in the greeting above. Change it anytime in Settings.">
      <li className="flex items-center gap-2 p-3">
        <Input
          name="start-name"
          value={draft}
          handleChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          placeholder="Type your name"
          aria-label="Your name"
          autoComplete="given-name"
          enterKeyHint="done"
          className="!my-0 min-w-0 flex-1"
        />
        <Button variant="primary" onClick={save} isDisabled={!draft.trim()} className="shrink-0 !px-5">
          Save
        </Button>
      </li>
    </StartGroup>
  );
}
