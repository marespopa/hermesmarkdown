"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseOAuthCallback, storeToken } from "@/app/services/drive/auth";

// Google OAuth implicit flow redirects here with the access token in the URL hash.
// We store the token and send the user back to the editor.
export default function GoogleOAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const result = parseOAuthCallback();
    if (result) {
      storeToken(result.accessToken, result.expiresIn);
      // Signal to the editor that it should open the Drive folder picker.
      // We pass a query param because the hash is consumed by parseOAuthCallback.
      sessionStorage.setItem("hermes_drive_just_authed", "1");
    }
    router.replace("/editor");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen text-zinc-500 text-sm">
      Connecting to Google Drive…
    </div>
  );
}
