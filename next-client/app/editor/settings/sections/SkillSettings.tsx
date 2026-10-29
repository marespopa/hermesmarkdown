"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import Button from "@/app/components/Button";
import { noteTypeOf } from "@/app/utils/note-type";
import SkillWizard from "@/app/editor/components/ai-chat/SkillWizard";

// Primary settings entry for creating and editing vault-authored skills.
export default function SkillSettings() {
  const metadata = useAtomValue(atom_fileMetadata);
  const [open, setOpen] = useState(false);
  const [skillPath, setSkillPath] = useState<string | undefined>();
  const paths = Object.keys(metadata).filter((path) => noteTypeOf(metadata[path]) === "skill").sort();
  const create = () => { setSkillPath(undefined); setOpen(true); };
  const edit = (path: string) => { setSkillPath(path); setOpen(true); };
  return (
    <section className="mt-5 rounded-xl border border-edge-subtle p-4" aria-labelledby="skills-settings-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div><h3 id="skills-settings-title" className="text-ui-headline font-semibold">Your skills</h3><p className="text-ui-caption text-fg-muted">Create or edit plain-text instructions stored in the open vault.</p></div>
        <Button variant="secondary" onClick={create}>Create skill</Button>
      </div>
      {paths.length ? <ul className="flex flex-col gap-1">{paths.map((path) => <li key={path} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-ui-caption text-fg-muted">{path}</span><Button variant="small" onClick={() => edit(path)}>Edit</Button></li>)}</ul> : <p className="text-ui-caption text-fg-faint">No skill notes in this vault yet.</p>}
      {open && <SkillWizard open={open} skillPath={skillPath} onClose={() => setOpen(false)} />}
    </section>
  );
}
