import React from "react";
import TextLink from "@/app/components/TextLink";

export default function ToolsCafeBadge() {
  return (
    <TextLink href="https://tools.cafe/p/tool-1784368796535" variant="unstyled">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://tools.cafe/badge.png" alt="Listed on tools.cafe" width="180" height="54" />
    </TextLink>
  );
}
