"use client";

import React from "react";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { TASK_VIEWS } from "@/app/editor/tasks/task-views";
import { BUILTIN_PACKS } from "@/app/utils/templates/template-packs";
import { SEARCH_PILL_WIDTH } from "./SearchPill";

// One placeholder shape. Static black / white so the opacity modifier works
// (the var-backed tokens drop it); pulses only when motion is allowed.
export const SKELETON_BAR = "bg-black/[0.06] dark:bg-white/[0.08] motion-safe:animate-pulse";

// The page the /editor sub-pages share (Templates, Tasks, Files, Trash,
// Tags, Settings), as ShellPage: plain, the whole window.
export const SUBPAGE_BACKDROP = "bg-surface text-ink-light dark:text-ink-dark";

// A bar in a line box set in the real text's type, so it takes that text's height.
function Text({ textClass, barClass }: { textClass: string; barClass: string }) {
  return (
    <span className={`relative block ${textClass}`}>
      {" "}
      <span className="absolute inset-0 flex items-center">
        <span className={`block rounded ${SKELETON_BAR} ${barClass}`} />
      </span>
    </span>
  );
}

// The SearchPill's shape: the editor's top-right corner and every title bar.
export function SearchPillSkeleton({ className = "" }: { className?: string }) {
  return <div style={{ width: SEARCH_PILL_WIDTH }} className={`h-8 min-w-0 rounded-lg ${SKELETON_BAR} ${className}`} />;
}

// ShellPage's title bar: ← Editor, the page's name, then the SearchPill.
// Static, so it's the real title.
function TitleHeader({ title }: { title: string }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-edge-subtle pl-5 pr-5 sm:pr-8">
      <span className="inline-flex shrink-0 items-center gap-1.5 text-ui-footnote font-medium text-fg-faint">
        <HiOutlineArrowLeft size={13} />
        Editor
      </span>
      <span className="h-4 w-px shrink-0 bg-edge-subtle" />
      <span className="min-w-0 flex-1 truncate text-ui-subhead font-semibold">{title}</span>
      <SearchPillSkeleton className="shrink" />
    </header>
  );
}

// UnifiedSearchInput's field: 44px on phones, 36px from sm.
function SearchField() {
  return <div className="h-11 rounded-xl border border-edge bg-paper-light dark:bg-paper-dark sm:h-9" />;
}

// Templates page: title and actions, two of your packs, then the built-in
// packs (static data, so their real names, descriptions and templates).
export function TemplatesSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <TitleHeader title="Templates" />
      <div className="mx-auto w-full max-w-3xl space-y-10 overflow-hidden px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-ui-title-2 font-semibold tracking-tight">Templates</h1>
            <Text textClass="mt-1 text-ui-footnote" barClass="h-2.5 w-4/5" />
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-8 w-28 rounded-lg ${SKELETON_BAR}`} />
            <div className={`h-8 w-24 rounded-lg ${SKELETON_BAR}`} />
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-ui-headline font-semibold">Your templates</h2>
          {[2, 3].map((rows, index) => (
            <div key={index} className="rounded-xl border border-edge-subtle bg-surface">
              <div className="flex items-center gap-3 border-b border-edge-subtle px-4 py-2.5">
                <div className="flex-1">
                  <Text textClass="text-ui-subhead" barClass="h-3 w-32" />
                </div>
                <div className={`h-8 w-40 rounded-lg ${SKELETON_BAR}`} />
              </div>
              <div className="divide-y divide-edge-subtle">
                {Array.from({ length: rows }, (_, row) => (
                  <div key={row} className="flex items-center gap-3 px-4 py-2">
                    <div className={`h-4 w-4 shrink-0 rounded ${SKELETON_BAR}`} />
                    <div className="min-w-0 flex-1">
                      <Text textClass="text-ui-subhead" barClass="h-3 w-1/3" />
                      <Text textClass="text-ui-caption" barClass="h-2 w-1/2" />
                    </div>
                    <div className={`h-8 w-32 rounded-lg ${SKELETON_BAR}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-ui-headline font-semibold">Template packs</h2>
            <Text textClass="mt-1 text-ui-footnote" barClass="h-2.5 w-3/4" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUILTIN_PACKS.map((pack) => (
              <div key={pack.id} className="flex flex-col rounded-xl border border-edge-subtle bg-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-ui-subhead font-semibold text-fg">{pack.name}</h3>
                    <p className="mt-0.5 text-ui-footnote text-fg-muted">{pack.description}</p>
                  </div>
                  <div className={`h-8 w-28 shrink-0 rounded-lg ${SKELETON_BAR}`} />
                </div>
                <ul className="mt-3 space-y-1.5">
                  {pack.templates.map((template) => (
                    <li key={template.name} className="flex items-start gap-2.5 text-ui-footnote">
                      <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded ${SKELETON_BAR}`} />
                      <span className="min-w-0">
                        <span className="text-fg">{template.name}</span>
                        <span className="text-fg-faint"> · {template.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// One task row (TaskRow): status ring, the task's text, a footnote line.
function TaskRowSkeleton({ width }: { width: string }) {
  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2 [@media(pointer:coarse)]:py-2.5">
      <div className="-m-1.5 flex h-7 w-7 shrink-0 items-center justify-center [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9">
        <div className={`h-4 w-4 rounded-full ${SKELETON_BAR}`} />
      </div>
      <div className="min-w-0 flex-1">
        <Text textClass="text-ui-caption" barClass={`h-2.5 ${width}`} />
        <Text textClass="mt-0.5 text-ui-footnote" barClass="h-2 w-24" />
      </div>
    </div>
  );
}

// Tasks page: the toolbar (title, the view tabs by their real names, the
// filter field), then two groups of task rows.
export function TasksSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <TitleHeader title="Tasks" />
      <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 px-4 py-5 sm:px-8">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-paper-pale/40 dark:bg-paper-dark/30">
          <div className="shrink-0 space-y-2.5 px-3 pb-3 pt-3">
            <div className="flex h-7 items-center gap-2">
              <h2 className="text-ui-subhead font-semibold">Tasks</h2>
            </div>
            <div className="grid grid-cols-5 rounded-lg bg-paper-softgray/70 p-0.5 dark:bg-paper-dark-surface/60">
              {TASK_VIEWS.map(({ id, label }) => (
                <span key={id} className="flex h-7 min-w-0 items-center justify-center truncate px-1 text-ui-footnote font-medium text-ink-muted dark:text-stone [@media(pointer:coarse)]:h-8">
                  {label}
                </span>
              ))}
            </div>
            <SearchField />
          </div>
          <div className="flex-1 space-y-4 px-2.5 pb-3 pt-1">
            {[["w-2/3", "w-1/2", "w-3/5"], ["w-1/2", "w-3/4"]].map((rows, group) => (
              <div key={group}>
                <div className="px-2.5 pb-1">
                  <Text textClass="text-ui-footnote" barClass="h-2.5 w-20" />
                </div>
                <div className="space-y-0.5">
                  {rows.map((width, row) => <TaskRowSkeleton key={row} width={width} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Files page: title, vault name and create buttons, search, the count line,
// then the tree in its panel.
export function FilesSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <TitleHeader title="All Notes" />
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-8">
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-ui-title-3 font-semibold">All Notes</h1>
            <Text textClass="text-ui-caption" barClass="h-2 w-24" />
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-8 w-8 rounded-lg sm:w-24 ${SKELETON_BAR}`} />
            <div className={`h-8 w-8 rounded-lg sm:w-28 ${SKELETON_BAR}`} />
          </div>
        </div>
        <div className="mb-3">
          <SearchField />
        </div>
        <div className="mb-3">
          <Text textClass="text-ui-footnote" barClass="h-2.5 w-36" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-edge-subtle bg-surface p-2">
          {["w-28", "w-36", "w-24", "w-40", "w-32", "w-28"].map((width, index) => (
            <div key={index} className="flex h-8 items-center gap-2 px-2" style={{ paddingLeft: index % 3 === 0 ? 8 : 28 }}>
              <div className={`h-3.5 w-3.5 shrink-0 rounded ${SKELETON_BAR}`} />
              <div className={`h-2.5 rounded-full ${width} ${SKELETON_BAR}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Settings: the section list in its side panel (a top strip below lg), and
// the open section's title over a few setting rows.
export function SettingsSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <TitleHeader title="Settings" />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex shrink-0 flex-col border-b border-edge-subtle lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex gap-0.5 overflow-hidden px-3 py-3 lg:flex-col">
          {["w-24", "w-16", "w-14", "w-20", "w-16"].map((width, index) => (
            <div key={index} className="flex h-8 shrink-0 items-center gap-2 px-2.5">
              <div className={`h-4 w-4 rounded ${SKELETON_BAR}`} />
              <div className={`h-2.5 rounded-full ${width} ${SKELETON_BAR}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <Text textClass="mb-5 text-ui-title-2" barClass="h-6 w-40 rounded-lg" />
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className={`h-16 rounded-xl ${SKELETON_BAR}`} />
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// Trash: its title and a few item rows.
export function TrashSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <TitleHeader title="Trash" />
      <div className="mx-auto w-full max-w-3xl space-y-6 overflow-hidden px-4 py-8 sm:px-8">
        <div>
          <h1 className="text-ui-title-2 font-semibold tracking-tight">Trash</h1>
          <Text textClass="mt-1 text-ui-footnote" barClass="h-2.5 w-3/5" />
        </div>
        <div className={`h-40 rounded-xl ${SKELETON_BAR}`} />
      </div>
    </div>
  );
}

// Tags: the tag list beside the notes column.
export function TagsSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <TitleHeader title="Tags" />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex shrink-0 flex-col gap-1 border-b border-edge-subtle p-3 md:w-60 md:border-b-0 md:border-r">
          {["w-20", "w-28", "w-16", "w-24"].map((width, index) => (
            <div key={index} className={`h-2.5 my-2 rounded-full ${width} ${SKELETON_BAR}`} />
          ))}
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}

// The skeleton for an /editor sub-page, by path; null for the editor itself.
export function routeSkeleton(pathname: string | null): React.ReactNode {
  if (pathname?.startsWith("/editor/templates")) return <TemplatesSkeleton />;
  if (pathname?.startsWith("/editor/tasks")) return <TasksSkeleton />;
  if (pathname?.startsWith("/editor/files")) return <FilesSkeleton />;
  if (pathname?.startsWith("/editor/settings")) return <SettingsSkeleton />;
  if (pathname?.startsWith("/editor/trash")) return <TrashSkeleton />;
  if (pathname?.startsWith("/editor/tags")) return <TagsSkeleton />;
  return null;
}
