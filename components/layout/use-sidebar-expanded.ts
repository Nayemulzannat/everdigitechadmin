"use client";

import { useSyncExternalStore } from "react";

// Whether the lg icon rail is expanded, remembered in localStorage.
// Read through useSyncExternalStore so the server render (collapsed) and the stored value never cause a
// hydration mismatch. Falls back to memory when storage is unavailable (private mode, blocked site data).
const STORAGE_KEY = "everdigitech.admin.sidebarExpanded";
const listeners = new Set<() => void>();
let memoryValue = false;

function read() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? memoryValue : stored === "1";
  } catch {
    return memoryValue;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(expanded: boolean) {
  memoryValue = expanded;
  try {
    window.localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
  } catch {
    // Storage blocked: the in-memory value still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function useSidebarExpanded() {
  const expanded = useSyncExternalStore(subscribe, read, () => false);
  return [expanded, write] as const;
}
