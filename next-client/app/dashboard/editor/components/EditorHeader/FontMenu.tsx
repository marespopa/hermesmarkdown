import DropdownMenu from "@/app/components/DropdownMenu";import Button from "@/app/components/Button";
import React, { useState } from "react";
import { useAtom } from "jotai";
import { atom_fontFamily } from "@/app/atoms/atoms";

interface FontMenuProps {
  fontOptions: { value: string; label: string }[];
  setFontFamily: (value: string) => void;
  value?: string;
}

const FontMenu: React.FC<FontMenuProps> = ({ fontOptions, setFontFamily, value }) => {
  const fontMenuOptions = fontOptions.map(option => ({
    label: option.label,
    action: () => setFontFamily(option.value)
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [atomFontFamily] = useAtom(atom_fontFamily);
  const fontFamily = value !== undefined ? value : atomFontFamily;
  const selectedIndex = fontOptions.findIndex(option => option.value === fontFamily);

  return (
    <DropdownMenu
      options={fontMenuOptions}
      label={<span className="flex items-center gap-2">Font</span>}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      selectedIndex={selectedIndex === -1 ? null : selectedIndex}
      onSelect={idx => setFontFamily(fontOptions[idx].value)}
    />
  );
};

export default FontMenu; 