"use client";

import React from "react";
import Link from "next/link";
import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { version } from "@/package.json";
import { SettingGroup, SettingItem } from "../components/SettingControls";

const ABOUT_LINKS = [
  { href: "/what-is-hermes-md", label: "What is HermesMarkdown" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const actionButtonClass = "h-8 px-4 text-ui-footnote font-medium";

// Settings → General, after the profile groups: Help (shortcuts, docs) and
// About (version, links).
export default function GuideSettings() {
  const router = useRouter();
  const setKeyboardShortcutsOpen = useSetAtom(atom_keyboardShortcutsOpen);

  return (
    <>
      <SettingGroup title="Help">
        <SettingItem
          label="Keyboard Shortcuts"
          description="See every shortcut for writing, navigation, and tabs."
          control={
            <Button variant="secondary" onClick={() => setKeyboardShortcutsOpen(true)} className={actionButtonClass}>
              Show Shortcuts
            </Button>
          }
        />
        <SettingItem
          label="Documentation"
          description="Guides for vaults, writing, workspaces, and AI features."
          control={
            <Button variant="secondary" onClick={() => router.push("/documentation")} className={actionButtonClass}>
              Open Docs
            </Button>
          }
        />
      </SettingGroup>
      <SettingGroup title="About">
        <SettingItem
          label="Version"
          description="HermesMarkdown runs in your browser and updates itself."
          control={<span className="text-ui-footnote font-medium tabular-nums text-ink-muted dark:text-stone">{version}</span>}
        />
        <SettingItem
          label="Links"
          layout="stack"
          control={
            <nav aria-label="About links" className="flex flex-wrap gap-x-4 gap-y-1 text-ui-footnote">
              {ABOUT_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sage hover:underline">
                  {link.label}
                </Link>
              ))}
            </nav>
          }
        />
      </SettingGroup>
    </>
  );
}
