import Image from "next/image";
import React from "react";

export default function ProductHuntBadge() {
  const badgeLoader = () => {
    return `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=377056&theme=dark`
  }
  
  return (
    <div className="flex justify-center items-start mt-2 sm:mt-0">
      <a
        href="https://www.producthunt.com/products/hermesmd?utm_source=badge-follow&utm_medium=badge&utm_source=badge-hermesmd"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=553021&theme=dark"
          alt="Hermes Markdown - The Markdown Editor That Respects Your Privacy | Product Hunt"
          style={{ width: "250px", height: "54px" }}
          width={250}
          height={54}
        />
      </a>
    </div>
  );
}
