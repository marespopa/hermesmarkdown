"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineColorSwatch, HiOutlineFolder, HiOutlinePencilAlt, HiOutlineAcademicCap, HiOutlineLightningBolt, HiOutlineUser } from "react-icons/hi";
import Button from "@/app/components/Button";
import AiSettings from "./sections/AiSettings";
import AppearanceSettings from "./sections/AppearanceSettings";
import EditorSettings from "./sections/EditorSettings";
import FilesSettings from "./sections/FilesSettings";
import GuideSettings from "./sections/GuideSettings";
import ProfileSettings from "./sections/ProfileSettings";

const SettingsPage = () => {
  const router = useRouter();

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
      id: "profile",
      label: "Profile",
      icon: HiOutlineUser,
      content: <ProfileSettings />,
    },
    {
      id: "guide",
      label: "Guide",
      icon: HiOutlineAcademicCap,
      content: <GuideSettings />,
    },
  ];

  const [activeSection, setActiveSection] = useState(sections[0].id);
  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-paper-pale font-sans text-ink-light selection:bg-sage/10 dark:bg-paper-dark dark:text-ink-dark lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-edge-subtle bg-chrome/85 backdrop-blur-2xl lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b border-edge-subtle px-4 pb-3 pt-4">
          <Button
            variant="unstyled"
            onClick={() => router.push("/editor")}
            title="Back to editor"
            className="group mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-ui-footnote font-medium text-ink-muted transition-colors hover:bg-paper-light/70 hover:text-ink-light focus:outline-none dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
          >
            <HiOutlineArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Editor
          </Button>
          <h1 className="text-ui-title-3 font-semibold tracking-tight">Settings</h1>
        </div>

        <nav aria-label="Settings sections" className="flex gap-0.5 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <Button
                variant="unstyled"
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex h-8 shrink-0 items-center gap-2 px-2.5 rounded-lg text-ui-subhead font-medium transition-colors focus:outline-none ${
                  isActive
                    ? "bg-paper-light/80 text-ink-light shadow-sm dark:bg-white/10 dark:text-ink-dark"
                    : "text-ink-muted hover:bg-paper-light/70 hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {s.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto bg-paper-pale custom-scrollbar dark:bg-paper-dark">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <h2 className="mb-5 text-ui-title-2 font-semibold tracking-tight">{active.label}</h2>
          {active.content}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
