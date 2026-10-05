import React from "react";
import {
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineLightningBolt,
  HiOutlinePaperAirplane,
  HiOutlineSun,
} from "react-icons/hi";
import { templateIcon, type TemplateIconKey } from "@/app/utils/templates/template-preview";

const ICONS: Record<TemplateIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  calendar: HiOutlineCalendar,
  bolt: HiOutlineLightningBolt,
  chart: HiOutlineChartBar,
  checklist: HiOutlineClipboardList,
  rocket: HiOutlinePaperAirplane,
  sun: HiOutlineSun,
  document: HiOutlineDocumentText,
};

// Monochrome icon picked from a template's name (templateIcon).
export default function TemplateIcon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  const Icon = ICONS[templateIcon(name)];
  return <Icon size={size} className={`shrink-0 ${className}`} aria-hidden />;
}
