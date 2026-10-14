"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineUser } from "react-icons/hi";
import { atom_userName } from "@/app/atoms/ui-atoms";
import { BareInput } from "@/app/components/Input";
import { ROW_DIVIDER, StartGroup, StartIcon } from "./StartGroup";

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
// Enter or leaving the field saves it (Settings → Profile changes it later);
// the greeting above picks it up and the card goes away.
export default function StartName() {
  const [userName, setUserName] = useAtom(atom_userName);
  const [draft, setDraft] = useState("");
  if (userName.trim() || hasStoredName()) return null;

  const save = () => {
    if (draft.trim()) setUserName(draft.trim());
  };

  return (
    <StartGroup footer="For the greeting. Change it anytime in Settings.">
      <li className="group/row flex items-center gap-3 pl-4">
        <StartIcon>
          <HiOutlineUser size={18} />
        </StartIcon>
        <label className={`flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-4 ${ROW_DIVIDER}`}>
          <span className="shrink-0 text-ui-body text-fg">Your Name</span>
          <BareInput
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="What should we call you?"
            autoComplete="given-name"
            enterKeyHint="done"
            className="min-w-0 flex-1 bg-transparent text-right text-ui-body text-fg placeholder:text-fg-faint focus:outline-none"
          />
        </label>
      </li>
    </StartGroup>
  );
}
