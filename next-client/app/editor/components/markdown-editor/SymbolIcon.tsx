import React from "react";
import type { IconType } from "react-icons";
import {
  VscSymbolClass, VscSymbolConstant, VscSymbolEnum, VscSymbolEnumMember, VscSymbolEvent, VscSymbolField,
  VscSymbolInterface, VscSymbolKey, VscSymbolMethod, VscSymbolMisc, VscSymbolNamespace, VscSymbolProperty,
  VscSymbolStructure, VscSymbolVariable,
} from "react-icons/vsc";
import type { SymbolKind } from "@/app/utils/markdown-outline";
import { SIDEBAR_ICON_CLASS } from "../sidebar/sidebar-classes";

const ICONS: Record<SymbolKind, IconType> = {
  module: VscSymbolNamespace,
  class: VscSymbolClass,
  struct: VscSymbolStructure,
  interface: VscSymbolInterface,
  enum: VscSymbolEnum,
  member: VscSymbolEnumMember,
  type: VscSymbolMisc,
  function: VscSymbolMethod,
  method: VscSymbolMethod,
  property: VscSymbolProperty,
  field: VscSymbolField,
  event: VscSymbolEvent,
  constant: VscSymbolConstant,
  variable: VscSymbolVariable,
  key: VscSymbolKey,
  selector: VscSymbolClass,
};

// A code outline row's leading glyph: the symbol's kind, in the sidebar's
// neutral icon grey (never coloured), hidden from screen readers.
export function SymbolIcon({ kind }: { kind: SymbolKind }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden size={14} className={SIDEBAR_ICON_CLASS} />;
}
