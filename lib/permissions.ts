// Permission model and the editing rules for roles. Pure functions only (no React, no I/O) so they can be unit tested.

import type { PermissionAction, PermissionKey, PermissionModule } from "@/types/permissions";

export type { PermissionAction, PermissionKey, PermissionModule };

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const satisfies readonly PermissionAction[];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

export interface PermissionState {
  modules: readonly PermissionModule[];
  /** Granted keys, always in catalog order (see `normalizePermissions`). */
  granted: readonly PermissionKey[];
  /** Locked roles (Super Admin) can't be changed. */
  locked: boolean;
}

export const permissionKey = (moduleKey: string, action: string): PermissionKey => `${moduleKey}.${action}`;

/** Every key a module has: its actions, then its special permission. */
export function moduleKeys(mod: PermissionModule): PermissionKey[] {
  const keys = mod.actions.map((a) => permissionKey(mod.key, a));
  if (mod.special) keys.push(permissionKey(mod.key, mod.special.action));
  return keys;
}

export function allPermissionKeys(modules: readonly PermissionModule[]): PermissionKey[] {
  return modules.flatMap(moduleKeys);
}

/** Drops unknown keys and duplicates and sorts into catalog order, so two grants can be compared directly. */
export function normalizePermissions(modules: readonly PermissionModule[], granted: Iterable<string>): PermissionKey[] {
  const set = new Set(granted);
  return allPermissionKeys(modules).filter((k) => set.has(k));
}

export function samePermissions(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

function findModule(modules: readonly PermissionModule[], key: string) {
  const dot = key.indexOf(".");
  if (dot <= 0) return null;
  const mod = modules.find((m) => m.key === key.slice(0, dot));
  return mod && moduleKeys(mod).includes(key as PermissionKey) ? { mod, action: key.slice(dot + 1) } : null;
}

/**
 * Flips one permission and applies the role rules:
 * - turning on any permission of a module also turns on that module's View;
 * - turning off View clears every permission of that module, including Special;
 * - locked roles and unknown keys are returned unchanged (same object).
 */
export function togglePermission(state: PermissionState, key: string): PermissionState {
  if (state.locked) return state;
  const found = findModule(state.modules, key);
  if (!found) return state;
  const { mod, action } = found;

  const granted = new Set<string>(state.granted);
  if (!granted.has(key)) {
    granted.add(key);
    if (action !== "view" && mod.actions.includes("view")) granted.add(permissionKey(mod.key, "view"));
  } else {
    granted.delete(key);
    if (action === "view") for (const k of moduleKeys(mod)) granted.delete(k);
  }
  return { ...state, granted: normalizePermissions(state.modules, granted) };
}

/** "Select all" for one module: on grants every permission of it, off clears them. */
export function setModulePermissions(state: PermissionState, moduleKey: string, on: boolean): PermissionState {
  if (state.locked) return state;
  const mod = state.modules.find((m) => m.key === moduleKey);
  if (!mod) return state;

  const granted = new Set<string>(state.granted);
  for (const k of moduleKeys(mod)) {
    if (on) granted.add(k);
    else granted.delete(k);
  }
  return { ...state, granted: normalizePermissions(state.modules, granted) };
}

/** How many of a module's permissions are granted. */
export function countModuleGranted(mod: PermissionModule, granted: readonly string[]) {
  const set = new Set(granted);
  return moduleKeys(mod).filter((k) => set.has(k)).length;
}
