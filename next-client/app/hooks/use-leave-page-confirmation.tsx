import SingletonRouter, { Router } from "next/router";
import { useEffect } from "react";

// Define the internal Router types that Next.js doesn't export publicly
type InternalRouter = Router & {
  change: (
    method: string,
    url: string,
    as: string,
    options: any,
  ) => Promise<boolean>;
  state: {
    asPath: string;
  };
};

const defaultConfirmationDialog = async (msg?: string) => window.confirm(msg);

/**
 * Inspiration from: https://stackoverflow.com/a/70759912/2592233
 */
export const useLeavePageConfirmation = (
  shouldPreventLeaving: boolean,
  message: string = "Changes you made may not be saved.",
  confirmationDialog: (
    msg?: string,
  ) => Promise<boolean> = defaultConfirmationDialog,
) => {
  useEffect(() => {
    const router = SingletonRouter.router as InternalRouter;

    if (!router?.change) {
      return;
    }

    const originalChangeFunction = router.change;
    const originalOnBeforeUnloadFunction = window.onbeforeunload;

    if (shouldPreventLeaving) {
      window.onbeforeunload = () => "";
    } else {
      window.onbeforeunload = originalOnBeforeUnloadFunction;
    }

    if (shouldPreventLeaving) {
      router.change = async (method, url, as, options) => {
        const currentUrl = router.state.asPath.split("?")[0];
        const changedUrl = as.split("?")[0];
        const hasNavigatedAwayFromPage = currentUrl !== changedUrl;
        const wasBackOrForwardBrowserButtonClicked = method === "replaceState";
        let confirmed = false;

        if (hasNavigatedAwayFromPage) {
          confirmed = await confirmationDialog(message);
        }

        if (confirmed) {
          return originalChangeFunction.apply(router, [
            method,
            url,
            as,
            options,
          ]);
        }

        if (wasBackOrForwardBrowserButtonClicked && hasNavigatedAwayFromPage) {
          await router.push(router.state.asPath);

          // Assuming "back" was clicked as per original logic
          history.go(1);
        }

        return false;
      };
    }

    return () => {
      router.change = originalChangeFunction;
      window.onbeforeunload = originalOnBeforeUnloadFunction;
    };
  }, [shouldPreventLeaving, message, confirmationDialog]);
};
