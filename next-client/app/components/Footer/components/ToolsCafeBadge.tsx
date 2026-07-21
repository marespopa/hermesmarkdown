import Image from "next/image";
import React from "react";

export default function ToolsCafeBadge() {
  return (
    <a href="https://tools.cafe/p/tool-1784368796535" target="_blank" rel="noopener">
      <Image
        src="https://tools.cafe/badge.png"
        alt="Listed on tools.cafe"
        width={180}
        height={54}
        unoptimized
      />
    </a>
  );
}
