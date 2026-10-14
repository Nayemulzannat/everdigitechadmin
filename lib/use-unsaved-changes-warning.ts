"use client";

import { useEffect } from "react";

export const UNSAVED_CHANGES_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * Warns before leaving while `dirty`:
 * - closing the tab, reloading or typing a new URL (the browser's own "Leave site?" prompt);
 * - clicking an in-app link (e.g. the sidebar). Next.js navigates client-side, so beforeunload doesn't fire;
 *   a capture-phase listener asks first and cancels the click before the router sees it.
 * The browser back button isn't intercepted.
 */
export function useUnsavedChangesWarning(dirty: boolean, message = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePage) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}
