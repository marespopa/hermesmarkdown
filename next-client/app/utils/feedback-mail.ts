// Help → Send Feedback…: the user's own mail app writes the message, so
// nothing passes through our servers.
export const FEEDBACK_EMAIL = "office@marespopa.com";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

// A mailto: link with the subject set and, under room to write, the app
// version and browser (they help with bug reports; the user can delete them).
export function feedbackMailHref(userAgent: string): string {
  const subject = "HermesMarkdown feedback";
  const body = `\n\n\n---\nHermesMarkdown ${APP_VERSION}\n${userAgent}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Hands the link to the browser, which opens the default mail app.
export function openMailLink(href: string) {
  window.location.href = href;
}
