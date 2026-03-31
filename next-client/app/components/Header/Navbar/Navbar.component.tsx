"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { FaBars } from "react-icons/fa";
import logo from "../../../../assets/logo.svg";
import NavigationLinks from "../Navigation/NavigationLinks";
import MobileNavigationLinks from "../Navigation/MobileNavigationLinks";
import useIsMobile from "@/app/hooks/use-is-mobile";
import Button from "../../Button";

const Navbar = () => {
  // State to manage the navbar's visibility
  const [isNavigationVisible, setIsNavigationVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

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
      <div className="flex items-center justify-between container max-w-screen-xl mx-auto px-4 sm:px-2">
        {/*Logo*/}
        <Link
          className="hover:scale-110 focus:scale-110 transition-transform ease-in"
          href={"/"}
        >
          <Image
            priority
            src={logo}
            alt="Hermes Markdown"
            width={200}
            className="dark:invert"
          />
        </Link>

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
