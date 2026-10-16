"use client";

import { useRouter } from "next/navigation";
import { HiOutlineDocumentText, HiOutlinePencilAlt, HiOutlineTemplate } from "react-icons/hi";
import Button from "@/app/components/Button";
import FeedTips from "./FeedTips";
import FeedWelcome from "./FeedWelcome";
import { StartGroup, StartIcon, StartRow } from "./StartGroup";

interface FeedEmptyProps {
  onNewNote: () => void;
  /** Opens a file from the device into the draft. */
  onOpenFile?: () => void;
}

// The feed's body for a vault with no notes yet: a welcome card with
// Start writing, other ways to begin (template packs, a file from the
// device), and a line of tips.
export default function FeedEmpty({ onNewNote, onOpenFile }: FeedEmptyProps) {
  const router = useRouter();
  return (
    <section aria-label="Empty vault" className="flex flex-col gap-8 pt-2">
      <FeedWelcome
        icon={<HiOutlinePencilAlt size={22} />}
        title="A clean slate"
        message="No notes in this vault yet. Your first one is a click away, saved as a plain Markdown file."
        action={
          <Button variant="primary" onClick={onNewNote}>
            <HiOutlinePencilAlt size={18} aria-hidden="true" />
            Start writing
          </Button>
        }
      />
      <StartGroup title="Other ways to begin">
        <StartRow
          icon={<StartIcon tone="sage"><HiOutlineTemplate size={18} /></StartIcon>}
          title="Browse Template Packs"
          subtitle="Meetings, writing, projects and more"
          onClick={() => router.push("/editor/templates")}
        />
        {onOpenFile && (
          <StartRow
            icon={<StartIcon tone="accent"><HiOutlineDocumentText size={18} /></StartIcon>}
            title="Open File…"
            subtitle="A Markdown file from this device"
            onClick={onOpenFile}
          />
        )}
      </StartGroup>
      <FeedTips />
    </section>
  );
}
