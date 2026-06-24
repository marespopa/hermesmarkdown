"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_schemaWizardOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultSchema } from "@/app/atoms/schema-atoms";
import { atom_vaultHandle } from "@/app/atoms/atoms";
import {
  atom_isDriveVault,
  atom_driveVaultId,
  atom_drivePathIndex,
  atom_driveVaultName,
} from "@/app/atoms/drive-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import {
  VaultSchema,
  SchemaField,
  FieldType,
  writeVaultSchema,
  ensureHermesFiles,
  serializeSchema,
  generateAgentsMd,
  generateTemplateMd,
  hashSchema,
  DEFAULT_SCHEMA,
} from "@/app/services/vault-schema";
import { installVaultFiles } from "@/app/services/vault-setup";
import {
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlus,
  HiCheck,
  HiX,
} from "react-icons/hi";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "enum", label: "Enum" },
  { value: "list", label: "List" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Boolean" },
  { value: "number", label: "Number" },
];

const TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  enum: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  list: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  date: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  boolean: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  number: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
};

// Fields whose key cannot be changed or deleted
const LOCKED_KEYS = new Set(["title"]);

interface FieldDraft extends SchemaField {
  _id: string;
  _isNew?: boolean;
}

let _seq = 0;
const uid = () => `fd${++_seq}`;

function toDrafts(fields: SchemaField[]): FieldDraft[] {
  return fields.map((f) => ({ ...f, _id: uid() }));
}

function toField(d: FieldDraft): SchemaField {
  const { _id, _isNew, ...rest } = d;
  return rest;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchemaWizard() {
  const [isOpen, setIsOpen] = useAtom(atom_schemaWizardOpen);
  const rawSchema = useAtomValue(atom_vaultSchema);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const setVaultSchema = useSetAtom(atom_vaultSchema);

  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [drivePathIndex, setDrivePathIndex] = useAtom(atom_drivePathIndex);
  const driveVaultName = useAtomValue(atom_driveVaultName);

  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FieldDraft>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const schema = rawSchema ?? DEFAULT_SCHEMA;
      setDrafts(toDrafts(schema.fields));
      setEditingId(null);
      setEditForm({});
    }
  }, [isOpen, rawSchema]);

  if (!isOpen) return null;

  const hasVault = vaultHandle || (isDriveVault && driveVaultId);

  // -------------------------------------------------------------------------
  // Field operations
  // -------------------------------------------------------------------------

  const startEdit = (d: FieldDraft) => {
    setEditingId(d._id);
    setEditForm({ ...d });
  };

  const cancelEdit = (d: FieldDraft) => {
    if (d._isNew) setDrafts((prev) => prev.filter((f) => f._id !== d._id));
    setEditingId(null);
    setEditForm({});
  };

  const applyEdit = () => {
    const key = (editForm.key ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d._id === editingId ? { ...d, ...editForm, key, _isNew: false } : d,
      ),
    );
    setEditingId(null);
    setEditForm({});
  };

  const addField = () => {
    const d: FieldDraft = { _id: uid(), _isNew: true, key: "", type: "string", required: false };
    setDrafts((prev) => [...prev, d]);
    startEdit(d);
  };

  const deleteField = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d._id !== id));
    if (editingId === id) { setEditingId(null); setEditForm({}); }
  };

  const move = (id: string, dir: "up" | "down") => {
    setDrafts((prev) => {
      const i = prev.findIndex((d) => d._id === id);
      if (i < 0) return prev;
      const t = dir === "up" ? i - 1 : i + 1;
      if (t < 0 || t >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (!hasVault) {
      showErrorToast("Open a vault first to save the schema.");
      return;
    }

    // Commit any open edit
    if (editingId) applyEdit();

    const fields = drafts.filter((d) => !d._isNew && d.key.trim()).map(toField);
    const newSchema: VaultSchema = {
      version: rawSchema?.version ?? 1,
      fields,
      agent_context: rawSchema?.agent_context ?? DEFAULT_SCHEMA.agent_context,
    };

    setIsSaving(true);
    try {
      if (isDriveVault && driveVaultId) {
        const yaml = serializeSchema(newSchema);
        const h = hashSchema(yaml);
        const vaultName = driveVaultName ?? "vault";
        const agents = generateAgentsMd(vaultName, newSchema, h);
        const template = generateTemplateMd(newSchema);

        await installVaultFiles(
          [
            { path: ".hermes/schema.yaml", description: "Frontmatter schema", content: yaml },
            { path: ".hermes/AGENTS.md", description: "Agent context", content: agents },
            { path: ".hermes/template.md", description: "File template", content: template },
          ],
          null,
          true,
          driveVaultId,
          drivePathIndex,
        );

        if (drivePathIndex) {
          drivePathIndex.saveToCache(driveVaultId);
          setDrivePathIndex(drivePathIndex);
        }
      } else if (vaultHandle) {
        await writeVaultSchema(newSchema, vaultHandle);
        // ensureHermesFiles reads the just-written schema and regenerates AGENTS.md + template.md
        const { schema } = await ensureHermesFiles(vaultHandle);
        setVaultSchema(schema);
      }

      if (isDriveVault) setVaultSchema(newSchema);
      showSuccessToast("Schema saved. Agent files updated.");
      setIsOpen(false);
    } catch (err: any) {
      showErrorToast(err.message || "Failed to save schema.");
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Shared input styles
  // -------------------------------------------------------------------------

  const inputCls =
    "w-full px-3 py-1.5 text-ui-footnote font-sans border rounded-lg outline-none focus-visible:outline-none transition-all " +
    "bg-paper-softgray border-beige text-ink-light placeholder:text-stone " +
    "dark:bg-paper-dark-surface/50 dark:border-clay dark:text-ink-dark dark:placeholder:text-stone " +
    "focus:ring-2 focus:ring-sage/20";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleSave}
      styles="sm:!max-w-lg"
      mobileSheet
      ariaLabelledBy="schema-wizard-heading"
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1 pr-8">
          <h2
            id="schema-wizard-heading"
            className="text-ui-body font-semibold text-ink-light dark:text-ink-dark"
          >
            Frontmatter Schema
          </h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Define the fields used across all notes in this vault. Saving updates{" "}
            <code className="text-[11px] font-mono bg-paper-softgray dark:bg-paper-dark-surface px-1 rounded">
              .hermes/schema.yaml
            </code>{" "}
            and regenerates agent context files.
          </p>
        </div>

        {/* Field list */}
        <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-0.5">
          {drafts.map((d, idx) => {
            const editing = editingId === d._id;
            const locked = LOCKED_KEYS.has(d.key) && !d._isNew;
            const typeCls = TYPE_COLORS[d.type] ?? TYPE_COLORS.string;

            return (
              <div
                key={d._id}
                className={`rounded-xl border transition-colors duration-150 ${
                  editing
                    ? "border-sage/40 bg-sage/[0.04] dark:border-sage/30"
                    : "border-beige dark:border-clay bg-paper-softgray/50 dark:bg-paper-dark/30"
                }`}
              >
                {/* Collapsed row */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="flex-1 min-w-0 text-ui-footnote font-medium text-ink-light dark:text-ink-dark truncate">
                    {d.key || <span className="text-stone italic">new field</span>}
                  </span>

                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${typeCls}`}>
                    {d.type}
                  </span>

                  {d.required && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400">
                      req
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={idx === 0 || editing}
                    onClick={() => move(d._id, "up")}
                    className="shrink-0 p-1 rounded text-stone hover:text-ink-light dark:hover:text-ink-dark disabled:opacity-25 transition-colors"
                  >
                    <HiOutlineChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === drafts.length - 1 || editing}
                    onClick={() => move(d._id, "down")}
                    className="shrink-0 p-1 rounded text-stone hover:text-ink-light dark:hover:text-ink-dark disabled:opacity-25 transition-colors"
                  >
                    <HiOutlineChevronDown size={13} />
                  </button>

                  {editing ? (
                    <button
                      type="button"
                      onClick={applyEdit}
                      title="Apply"
                      className="shrink-0 p-1 rounded text-sage hover:text-sage/70 transition-colors"
                    >
                      <HiCheck size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(d)}
                      title="Edit field"
                      className="shrink-0 p-1 rounded text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors"
                    >
                      <HiOutlinePencil size={12} />
                    </button>
                  )}

                  {locked ? (
                    <div className="w-[22px] shrink-0" />
                  ) : (
                    <button
                      type="button"
                      title={editing ? "Cancel" : "Remove"}
                      onClick={() => (editing ? cancelEdit(d) : deleteField(d._id))}
                      className="shrink-0 p-1 rounded text-stone hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      {editing ? <HiX size={13} /> : <HiOutlineTrash size={12} />}
                    </button>
                  )}
                </div>

                {/* Edit panel */}
                {editing && (
                  <div className="flex flex-col gap-3 px-3 pb-3 pt-1 border-t border-sage/20 dark:border-sage/15">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-stone">
                          Key
                        </label>
                        <input
                          type="text"
                          value={editForm.key ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, key: e.target.value }))}
                          disabled={locked}
                          placeholder="field_key"
                          className={inputCls + (locked ? " opacity-50 cursor-not-allowed" : "")}
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-stone">
                          Type
                        </label>
                        <select
                          value={editForm.type ?? "string"}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, type: e.target.value as FieldType }))
                          }
                          className={inputCls + " cursor-pointer"}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {editForm.type === "enum" && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-stone">
                          Values{" "}
                          <span className="normal-case font-normal opacity-60">(comma-separated)</span>
                        </label>
                        <input
                          type="text"
                          value={(editForm.values ?? []).join(", ")}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              values: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }))
                          }
                          placeholder="draft, active, archived"
                          className={inputCls}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-stone">
                        Description{" "}
                        <span className="normal-case font-normal opacity-60">(shown in wizard)</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.description ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Hint shown to user when filling this field"
                        className={inputCls}
                      />
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Required toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, required: !f.required }))}
                          role="switch"
                          aria-checked={!!editForm.required}
                          className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                            editForm.required ? "bg-sage" : "bg-neutral-300 dark:bg-neutral-600"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
                              editForm.required ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone">
                          Required
                        </span>
                      </div>

                      {/* Default value — not for list/boolean */}
                      {editForm.type !== "list" && editForm.type !== "boolean" && (
                        <div className="flex items-center gap-2 ml-auto">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-stone shrink-0">
                            Default
                          </label>
                          <input
                            type="text"
                            value={editForm.default ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, default: e.target.value }))}
                            placeholder="e.g. draft"
                            className={inputCls + " w-28"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add field */}
        <button
          type="button"
          onClick={addField}
          disabled={editingId !== null}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-beige dark:border-clay text-stone hover:text-sage hover:border-sage dark:hover:text-sage dark:hover:border-sage disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-ui-footnote font-medium"
        >
          <HiOutlinePlus size={13} />
          Add field
        </button>

        {!hasVault && (
          <p className="text-ui-caption text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
            Open a vault to save schema changes to disk.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="outlined" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !hasVault}>
            {isSaving ? "Saving…" : "Save Schema"}
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
