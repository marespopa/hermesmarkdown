"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_terminalHost, atom_terminalUser } from "@/app/atoms/ui-atoms";
import { BareInput, FIELD_COMPACT_CLASS } from "@/app/components/Input";
import { buildSshUri } from "@/app/services/terminal-uri";
import { SettingGroup, SettingItem, SettingNote } from "../components/SettingControls";

// Settings → General → Terminal: the user and host the "Open Terminal"
// palette command opens as ssh://user@host (services/terminal-uri.ts).
// Both are trimmed on blur, as Your Name is.
export default function TerminalSettings() {
  const [user, setUser] = useAtom(atom_terminalUser);
  const [host, setHost] = useAtom(atom_terminalHost);
  const uri = buildSshUri(user, host);

  return (
    <SettingGroup title="Terminal">
      <SettingItem
        label="User"
        description="The account to sign in as. Leave empty to use your SSH default."
        control={
          <BareInput
            value={user}
            onChange={(e) => setUser(e.target.value)}
            onBlur={() => setUser(user.trim())}
            placeholder="Default"
            aria-label="Terminal user"
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            className={`${FIELD_COMPACT_CLASS} w-44`}
          />
        }
      />
      <SettingItem
        label="Host"
        description={uri ? `Open Terminal opens ${uri}` : "Enter a host name or IP address, like localhost."}
        control={
          <BareInput
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onBlur={() => setHost(host.trim())}
            placeholder="localhost"
            aria-label="Terminal host"
            aria-invalid={!uri}
            maxLength={253}
            autoComplete="off"
            spellCheck={false}
            className={`${FIELD_COMPACT_CLASS} w-44`}
          />
        }
      />
      <SettingNote>
        Open Terminal hands an ssh:// link to your system&apos;s default SSH app (Terminal, iTerm, Windows OpenSSH), and the browser asks first. The target machine needs SSH turned on (Remote Login on macOS). Where no app handles ssh:// links, such as most phones, nothing opens.
      </SettingNote>
    </SettingGroup>
  );
}
