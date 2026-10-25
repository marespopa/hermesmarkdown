// Page-view analytics (LiteAnalytics) without their `lite.js`, which reports
// the full URL on load and on every history change. The editor keeps the open
// note's vault path in `?file=` (and tags in `?tag=`), so that leaked note and
// folder names. This sends the same beacon with the page's path only: no
// query, no hash, and only the referrer's origin.

const QUEUE = "https://liteanalytics.com/queue";
const HOST = "hermesmarkdown.com";

export interface PageView {
  loc: string;
  ref: string;
  scr: string;
  tz: string;
  e: "pageview";
  ts: number;
}

const originOf = (url: string) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};

export function pageViewPayload(href: string, referrer: string, screenSize: string, timeZone: string, now: number): PageView {
  const url = new URL(href);
  return { loc: url.origin + url.pathname, ref: originOf(referrer), scr: screenSize, tz: timeZone, e: "pageview", ts: now };
}

export function sendPageView(): void {
  if (typeof navigator.sendBeacon !== "function" || navigator.webdriver) return;
  try {
    if (localStorage.getItem("lta_do_not_track") === "true") return;
  } catch {
    // Storage blocked: count the view anyway, it carries nothing personal.
  }
  const payload = pageViewPayload(
    window.location.href,
    document.referrer,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    Date.now(),
  );
  navigator.sendBeacon(`${QUEUE}?v=1&h=${encodeURIComponent(HOST)}&a=pageview`, JSON.stringify(payload));
}
