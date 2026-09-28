"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import Button from "./Button";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

// Registers /sw.js so the installed app starts offline, and offers a reload
// when a newer version has been downloaded. Production only: in development
// a cached shell would hide code changes.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const reloadOnTakeover = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const offerUpdate = (worker: ServiceWorker) => {
      toast(
        (t) => (
          <span className="flex items-center gap-3">
            <span>A new version of HermesMarkdown is ready.</span>
            <Button
              variant="primary"
              className="shrink-0"
              onClick={() => {
                toast.dismiss(t.id);
                navigator.serviceWorker.addEventListener("controllerchange", reloadOnTakeover);
                worker.postMessage({ type: "SKIP_WAITING" });
              }}
            >
              Reload
            </Button>
          </span>
        ),
        { id: "sw-update", duration: Infinity },
      );
    };

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { scope: "/" })
      .then((registration) => {
        // Only an update when a previous version already controls the page.
        if (registration.waiting && navigator.serviceWorker.controller) {
          offerUpdate(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              offerUpdate(installing);
            }
          });
        });
      })
      .catch((err) => console.warn("Service worker registration failed:", err));

    return () => navigator.serviceWorker.removeEventListener("controllerchange", reloadOnTakeover);
  }, []);

  return null;
}
