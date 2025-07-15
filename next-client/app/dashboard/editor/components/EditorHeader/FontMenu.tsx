import DropdownMenu from "@/app/components/DropdownMenu";import Button from "@/app/components/Button";
import React, { useState } from "react";
import { useAtom } from "jotai";
import { atom_fontFamily } from "@/app/atoms/atoms";

interface FontMenuProps {
  fontOptions: { value: string; label: string }[];
  setFontFamily: (value: string) => void;
}

const FontMenu: React.FC<FontMenuProps> = ({ fontOptions, setFontFamily }) => {
  const fontMenuOptions = fontOptions.map(option => ({
    label: option.label,
    action: () => setFontFamily(option.value)
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [fontFamily] = useAtom(atom_fontFamily);
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