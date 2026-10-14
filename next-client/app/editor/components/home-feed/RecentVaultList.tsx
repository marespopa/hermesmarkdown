"use client";

import { HiX } from "react-icons/hi";
import Button from "@/app/components/Button";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import { VAULT_KIND_LABEL, VaultKindIcon } from "./FeedVault";
import { StartGroup, StartIcon, StartRow } from "./StartGroup";

// Recently opened vaults on the no-vault start screen, as a grouped card: one
// tap reopens a vault (a folder on disk may ask for access again); × drops it
// from the list without touching its files. Renders nothing until a vault has
// been opened.
export default function RecentVaultList() {
  const { recentVaults, openRecentVault, forgetRecentVault } = useRecentVaults();
  if (recentVaults.length === 0) return null;

  return (
    <StartGroup title="Recent vaults">
      {recentVaults.map((entry) => (
        <StartRow
          key={entry.key}
          icon={<StartIcon><VaultKindIcon kind={entry.kind} size={16} /></StartIcon>}
          title={entry.name}
          subtitle={VAULT_KIND_LABEL[entry.kind]}
          onClick={() => { void openRecentVault(entry); }}
          trailing={
            <Button
              variant="unstyled"
              onClick={() => forgetRecentVault(entry.key)}
              aria-label={`Remove ${entry.name} from recent vaults`}
              title="Remove from list"
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-fg-faint opacity-0 transition hover:bg-edge-subtle hover:text-fg focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <HiX size={14} aria-hidden="true" />
            </Button>
          }
        />
      ))}
    </StartGroup>
  );
}
