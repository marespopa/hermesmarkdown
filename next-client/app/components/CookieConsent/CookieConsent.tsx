"use client";

import Link from "next/link";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import Button from "../Button";

const USER_CONSENT_COOKIE_KEY = "cookie_consent_is_true";
const USER_CONSENT_COOKIE_EXPIRE_DAYS = 365;

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const hasConsented = Cookies.get(USER_CONSENT_COOKIE_KEY);
    if (hasConsented === undefined) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    Cookies.set(USER_CONSENT_COOKIE_KEY, "true", {
      expires: USER_CONSENT_COOKIE_EXPIRE_DAYS,
    });
    setShowBanner(false);
  };

  const handleReject = () => {
    Cookies.set(USER_CONSENT_COOKIE_KEY, "false", {
      expires: USER_CONSENT_COOKIE_EXPIRE_DAYS,
    });
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <section className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-50 pointer-events-none">
      <div className="max-w-screen-xl mx-auto pointer-events-auto">
        <div className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-lg lg:flex-row lg:items-center">
          <div className="flex-1 text-gray-700 dark:text-gray-300">
            <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
              Privacy & Cookies
            </h2>
            <p className="text-sm leading-relaxed">
              This website uses basic, anonymous analytics to understand how
              people use my site and improve the experience. No personal data is
              shared with third parties, and your writing never leaves your
              machine. Learn more in my{" "}
              <Link
                href="/privacy-policy"
                className="underline hover:text-lightAccent font-semibold"
              >
                privacy policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:justify-end min-w-fit">
            <Button
              variant="secondary"
              onClick={() => handleReject()}
              label="Reject All"
              className="w-full sm:w-auto px-8"
            />
            <Button
              variant="secondary"
              onClick={() => handleAccept()}
              label="Accept All"
              className="w-full sm:w-auto px-8"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CookieConsent;
