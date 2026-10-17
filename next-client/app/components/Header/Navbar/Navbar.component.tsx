"use client";

import Image from "next/image";
import TextLink from "@/app/components/TextLink";
import React, { useEffect, useState } from "react";
import { FaBars } from "react-icons/fa";
import logoWhite from "../../../../assets/logo-white.svg";
import logoDark from "../../../../assets/logo-dark.svg";
import NavigationLinks from "../Navigation/NavigationLinks";
import MobileNavigationLinks from "../Navigation/MobileNavigationLinks";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";
import Button from "../../Button";

const Navbar = () => {
  const [isNavigationVisible, setIsNavigationVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const resolvedTheme = useResolvedTheme();
  const logo = resolvedTheme === "dark" ? logoDark : logoWhite;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Toggle function to handle the navbar's display
  const toggleNav = () => {
    setIsNavigationVisible(!isNavigationVisible);
  };

  return (
    <>
      <div className="container max-w-screen-xl flex items-center justify-between">
        {/*Logo*/}
        <TextLink href="/" variant="unstyled">
          <Image
            priority
            src={logo}
            alt="HermesMarkdown"
            width={200}
          />
        </TextLink>

        {/*Menu Hamburg*/}
        <div className="lg:hidden mr-4">
          <Button
            onClick={toggleNav}
            variant="secondary"
            aria-label="Toggle navigation"
          >
            <FaBars />
          </Button>
        </div>

        {/* Navigation links */}
        {!isMobile && <NavigationLinks />}
      </div>

      {/* Mobile Navigation links */}
      {isMobile && isNavigationVisible && (
        <MobileNavigationLinks handleClose={toggleNav} />
      )}
    </>
  );
};

export default Navbar;
