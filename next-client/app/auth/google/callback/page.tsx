"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseOAuthCallback, storeToken } from "@/app/services/drive/auth";

// Google OAuth implicit flow redirects here with the access token in the URL hash.
// We store the token and send the user back to the editor.
export default function GoogleOAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "error">("connecting");

  useEffect(() => {
    const result = parseOAuthCallback();
    if (result) {
      storeToken(result.accessToken, result.expiresIn);
      sessionStorage.setItem("hermes_drive_just_authed", "1");
      router.replace("/editor");
    } else {
      setStatus("error");
      const t = setTimeout(() => router.replace("/editor"), 2500);
      return () => clearTimeout(t);
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 bg-surface">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        {/* Google Drive icon */}
        <svg width="48" height="42" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>

        {status === "connecting" ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-edge border-t-sage animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-fg">Connecting to Google Drive</p>
              <p className="text-xs text-fg-faint">Finishing authentication…</p>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-fg">Authentication failed</p>
            <p className="text-xs text-fg-faint">Redirecting you back…</p>
          </div>
        )}
      </div>
    </div>
  );
}
