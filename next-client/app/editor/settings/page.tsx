"use client";

import { useEffect, useState } from "react";
import { HiOutlineColorSwatch, HiOutlineFolder, HiOutlinePencilAlt, HiOutlineAdjustments, HiOutlineLightningBolt } from "react-icons/hi";
import Button from "@/app/components/Button";
import AiSettings from "./sections/AiSettings";
import AppearanceSettings from "./sections/AppearanceSettings";
import EditorSettings from "./sections/EditorSettings";
import FilesSettings from "./sections/FilesSettings";
import GuideSettings from "./sections/GuideSettings";
import ProfileSettings from "./sections/ProfileSettings";
import TerminalSettings from "./sections/TerminalSettings";
import ShellPage from "../components/ShellPage";
import { readUrlParam, replaceUrlParam, SECTION_PARAM } from "../utils/editor-url";

// Settings, one section at a time; the open one is in the URL
// (`?section=editor`), so a refresh or a link lands on it.
const SettingsPage = () => {

  const sections = [
    {
      id: "appearance",
      label: "Appearance",
      icon: HiOutlineColorSwatch,
      content: <AppearanceSettings />,
    },
    {
      id: "editor",
      label: "Editor",
      icon: HiOutlinePencilAlt,
      content: <EditorSettings />,
    },
    {
      id: "files",
      label: "Files",
      icon: HiOutlineFolder,
      content: <FilesSettings />,
    },
    {
      id: "ai",
      label: "AI Features",
      icon: HiOutlineLightningBolt,
      content: <AiSettings />,
    },
    {
      id: "general",
      label: "General",
      icon: HiOutlineAdjustments,
      // Your name and data first, then the terminal, then onboarding, help and about.
      content: (
        <>
          <ProfileSettings />
          <TerminalSettings />
          <GuideSettings />
        </>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState(sections[0].id);
  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  // Read after mount: the URL doesn't exist on the server.
  useEffect(() => {
    const fromUrl = readUrlParam(SECTION_PARAM);
    if (fromUrl && sections.some((s) => s.id === fromUrl)) setActiveSection(fromUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openSection = (id: string) => {
    setActiveSection(id);
    replaceUrlParam(SECTION_PARAM, id === sections[0].id ? null : id);
  };

  return (
    <ShellPage title="Settings" help={{ href: "/documentation#settings", label: "What the settings do" }}>
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-edge-subtle lg:w-60 lg:border-b-0 lg:border-r">
        <nav aria-label="Settings sections" className="flex gap-0.5 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <Button
                variant="unstyled"
                key={s.id}
                onClick={() => openSection(s.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-8 shrink-0 items-center gap-2 px-2.5 rounded-lg text-ui-subhead font-medium transition-colors focus:outline-none ${
                  isActive
                    ? "bg-fill-hover text-fg"
                    : "text-fg-muted hover:bg-fill hover:text-fg"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {s.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <h2 className="mb-5 text-ui-title-2 font-semibold tracking-tight">{active.label}</h2>
          {active.content}
        </div>
      </main>
    </div>
    </ShellPage>
  );
};

export default SettingsPage;
