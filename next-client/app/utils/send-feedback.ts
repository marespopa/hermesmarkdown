import { showCopyToast } from "@/app/components/Toastr";
import { FEEDBACK_EMAIL, feedbackMailHref, openMailLink } from "./feedback-mail";

// Send Feedback… (the Help menu and the palette): opens the user's own mail
// app, and copies the address for anyone with none set up (webmail only),
// where the link does nothing visible.
export function sendFeedback() {
  void navigator.clipboard?.writeText(FEEDBACK_EMAIL).catch(() => {});
  showCopyToast(`Opening your email app. Address copied: ${FEEDBACK_EMAIL}`);
  openMailLink(feedbackMailHref(navigator.userAgent));
}
