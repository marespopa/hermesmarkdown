"use client";

import { HiX } from "react-icons/hi";
import Button from "@/app/components/Button";
import { useRecentVaults } from "../../hooks/use-recent-vaults";
import { VAULT_KIND_LABEL, VaultKindIcon } from "./FeedVault";

// Recently opened vaults on the no-vault start screen: one click reopens a
// vault (a folder on disk may ask for access again); × drops it from the list
// without touching its files. Renders nothing until a vault has been opened.
export default function RecentVaultList() {
  const { recentVaults, openRecentVault, forgetRecentVault } = useRecentVaults();
  if (recentVaults.length === 0) return null;

  return (
    <section aria-labelledby="recent-vaults-heading" className="flex w-full flex-col gap-1">
      <p id="recent-vaults-heading" className="text-ui-footnote text-fg-muted">Recent vaults</p>
      <ul className="-mx-3 flex flex-col">
        {recentVaults.map((entry) => (
          <li key={entry.key} className="group/vault relative">
            <Button
              variant="unstyled"
              onClick={() => { void openRecentVault(entry); }}
              className="flex w-full min-w-0 items-center gap-2.5 rounded-lg py-2 pl-3 pr-10 text-left transition-colors hover:bg-surface-raised"
            >
              <span className="shrink-0 text-fg-muted"><VaultKindIcon kind={entry.kind} size={16} /></span>
              <span className="truncate text-ui-callout font-medium text-fg">{entry.name}</span>
              <span className="shrink-0 truncate text-ui-footnote text-fg-faint">{VAULT_KIND_LABEL[entry.kind]}</span>
            </Button>
            <Button
              variant="unstyled"
              onClick={() => forgetRecentVault(entry.key)}
              aria-label={`Remove ${entry.name} from recent vaults`}
              title="Remove from list"
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-faint opacity-0 transition-opacity hover:text-fg focus-visible:opacity-100 group-hover/vault:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <HiX size={14} aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
