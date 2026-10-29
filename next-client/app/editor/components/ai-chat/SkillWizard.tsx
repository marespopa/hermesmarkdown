"use client";

import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Input, { Textarea } from "@/app/components/Input";
import { PROJECT_CHECKS } from "@/app/services/project-checks";
import Toggle from "@/app/components/Toggle/Toggle.component";
import { COMPANION_SKILL_TOOL_BINDINGS } from "@/app/services/companion-tool-defs";
import type { CompanionToolName } from "@/app/services/companion-tool-defs";
import type { ProjectCheckId } from "@/app/services/project-checks";
import { useSkillWizard } from "./use-skill-wizard";

interface SkillWizardProps { open: boolean; skillPath?: string; onClose: () => void; }

// A create/edit form for declarative vault skill notes. Fixed binding choices
// are metadata only; the Markdown body is never executed.
export default function SkillWizard({ open, skillPath, onClose }: SkillWizardProps) {
  const { draft, setDraft, loading, saving, error, warnings, save } = useSkillWizard(open, skillPath, onClose);
  const toggle = <T extends string>(values: T[], value: T, update: (next: T[]) => void) => update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return (
    <DialogModal isOpened={open} onClose={onClose} ariaLabelledBy="skill-wizard-title" mobileSheet>
      <h2 id="skill-wizard-title" className="mb-1 text-ui-title-2 font-semibold">{skillPath ? "Edit skill" : "Create skill"}</h2>
      <p className="mb-4 text-ui-caption text-fg-muted">Skills are plain Markdown instructions. They cannot run code or define commands.</p>
      {loading ? <p role="status">Loading skill…</p> : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-ui-caption text-fg-muted">Name
            <Input name="skill-name" value={draft.name} handleChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-ui-caption text-fg-muted">Description
            <Input name="skill-description" value={draft.description} handleChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-ui-caption text-fg-muted">Instructions
            <Textarea name="skill-body" aria-label="Instructions" value={draft.body} handleChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} rows={7} />
          </label>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-ui-caption font-medium text-fg">Tool bindings (optional)</legend>
            {COMPANION_SKILL_TOOL_BINDINGS.map((tool) => <div key={tool} className="flex items-center justify-between gap-2 text-ui-caption text-fg-muted"><span>{tool}</span><Toggle active={draft.toolBindings.includes(tool)} onChange={() => toggle(draft.toolBindings, tool, (toolBindings) => setDraft((current) => ({ ...current, toolBindings: toolBindings as CompanionToolName[] })))} label={`${tool} tool binding`} /></div>)}
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-ui-caption font-medium text-fg">Project-check bindings (optional; approval is still required)</legend>
            {PROJECT_CHECKS.map(({ id, label }) => <div key={id} className="flex items-center justify-between gap-2 text-ui-caption text-fg-muted"><span>{label}</span><Toggle active={draft.projectChecks.includes(id)} onChange={() => toggle(draft.projectChecks, id, (projectChecks) => setDraft((current) => ({ ...current, projectChecks: projectChecks as ProjectCheckId[] })))} label={`${label} project-check binding`} /></div>)}
          </fieldset>
          {warnings.map((warning) => <p key={warning} className="text-ui-caption text-fg-muted">Existing metadata warning: {warning}</p>)}
          {error && <p role="alert" className="text-ui-caption text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outlined" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={saving || loading} onClick={() => void save()}>{saving ? "Saving…" : "Save skill"}</Button>
          </div>
        </div>
      )}
    </DialogModal>
  );
}
