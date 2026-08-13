"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A real focus trap for a modal dialog — checked live for the first time
 * this phase (the brief specifically asked not to assume prior dialogs had
 * one). Confirmed: CreateRoomDialog/CreatePollDialog/RoomMembersPanel/
 * RoomPollsPanel all auto-focus on open and close on Escape, but none of
 * them actually trap Tab inside the dialog (a keyboard user can Tab straight
 * past the dialog into the page behind it) or restore focus to whatever
 * triggered the dialog once it closes. Retrofitting all four is outside
 * this phase's scope (Report/Block/Mute) — see the report — but every new
 * dialog this phase adds uses this hook, and it's written so a future pass
 * can drop it into the existing ones with a two-line change.
 *
 * `active` lets a dialog mount with the trap disabled until it's actually
 * shown, matching how these dialogs are typically conditionally rendered.
 */
export function useDialogFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      return Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    }

    const focusable = getFocusable();
    (focusable[0] ?? container).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to whatever triggered the dialog — without this, a
      // keyboard user closing the dialog lands back at the top of the
      // document instead of where they were.
      previouslyFocused?.focus();
    };
  }, [containerRef, active]);
}
