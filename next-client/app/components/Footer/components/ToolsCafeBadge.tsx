import Image from "next/image";
import React from "react";

export default function ToolsCafeBadge() {
  return (
    <a href="https://tools.cafe" target="_blank" rel="noopener">
      <Image
        src="https://tools.cafe/b/dark.svg"
        alt="Featured on tools.cafe"
        width={256}
        height={80}
        unoptimized
      />
    </a>
  );
}
