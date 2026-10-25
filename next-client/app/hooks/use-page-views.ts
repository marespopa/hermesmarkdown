import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { sendPageView } from "@/app/utils/page-view";

// One page view per path, in production only. Query changes (the editor's
// `?file=`, `?tag=`) aren't views and are never sent (utils/page-view.ts).
export default function usePageViews() {
  const pathname = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") sendPageView();
  }, [pathname]);
}
