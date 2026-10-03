"use client";

import { useEffect } from "react";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

// Registers /sw.js so the installed app starts offline. A newer version
// activates on its own; the next load runs it. Production only: in
// development a cached shell would hide code changes.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { scope: "/" })
      .catch((err) => console.warn("Service worker registration failed:", err));
  }, []);

  return null;
}
