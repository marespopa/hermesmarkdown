import Image from "next/image";
import React from "react";
import TextLink from "@/app/components/TextLink";

const BADGE_BASE =
  "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1311624";
const BADGE_ALT =
  "HermesMarkdown - A place where all you can do is write. | Product Hunt";

export default function ProductHuntBadge() {
  return (
    <div className="flex justify-center items-start mt-2 sm:mt-0">
      <TextLink
        href="https://www.producthunt.com/products/hermesmd?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-hermesmarkdown-2"
        variant="unstyled"
      >
        <Image
          src={`${BADGE_BASE}&theme=neutral&t=1794376379314`}
          alt={BADGE_ALT}
          width={250}
          height={54}
          style={{ width: "250px", height: "auto" }}
          className="dark:hidden"
          unoptimized
        />
        <Image
          src={`${BADGE_BASE}&theme=dark&t=1794376384803`}
          alt={BADGE_ALT}
          width={250}
          height={54}
          style={{ width: "250px", height: "auto" }}
          className="hidden dark:block"
          unoptimized
        />
      </TextLink>
    </div>
  );
}
