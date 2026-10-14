import { describe, expect, it } from "vitest";
import {
  countModuleGranted,
  normalizePermissions,
  setModulePermissions,
  togglePermission,
  type PermissionModule,
  type PermissionState,
} from "./permissions";

const crud = ["view", "create", "edit", "delete"] as PermissionModule["actions"];

const MODULES: PermissionModule[] = [
  { key: "clients", label: "Clients", description: "", actions: crud, special: { action: "login_as", label: "Log in as client" } },
  { key: "invoices", label: "Invoices", description: "", actions: crud, special: { action: "refund", label: "Issue refunds" } },
  { key: "payments", label: "Payments", description: "", actions: ["view", "create", "edit"], special: { action: "approve", label: "Approve" } },
  { key: "servers", label: "Servers", description: "", actions: crud, special: null },
];

const state = (granted: string[] = [], locked = false): PermissionState => ({
  modules: MODULES,
  granted: normalizePermissions(MODULES, granted),
  locked,
});

describe("togglePermission", () => {
  it("turns a permission on", () => {
    expect(togglePermission(state(["servers.view"]), "servers.edit").granted).toEqual(["servers.view", "servers.edit"]);
  });

  it("turns on the module's View when another permission of it is turned on", () => {
    expect(togglePermission(state(), "invoices.delete").granted).toEqual(["invoices.view", "invoices.delete"]);
  });

  it("turns on View when the Special permission is turned on", () => {
    expect(togglePermission(state(), "invoices.refund").granted).toEqual(["invoices.view", "invoices.refund"]);
  });

  it("only touches the module of the toggled key", () => {
    expect(togglePermission(state(["clients.view"]), "servers.create").granted).toEqual([
      "clients.view",
      "servers.view",
      "servers.create",
    ]);
  });

  it("clears every permission of the module, including Special, when View is turned off", () => {
    const before = state(["clients.view", "clients.edit", "clients.login_as", "invoices.view", "invoices.refund"]);
    expect(togglePermission(before, "clients.view").granted).toEqual(["invoices.view", "invoices.refund"]);
  });

  it("keeps View and the rest when a non-View permission is turned off", () => {
    const before = state(["invoices.view", "invoices.edit", "invoices.refund"]);
    expect(togglePermission(before, "invoices.edit").granted).toEqual(["invoices.view", "invoices.refund"]);
  });

  it("leaves View on after turning a permission on and off again", () => {
    const on = togglePermission(state(), "servers.delete");
    expect(togglePermission(on, "servers.delete").granted).toEqual(["servers.view"]);
  });

  it("returns the same state for a locked role", () => {
    const locked = state(["clients.view"], true);
    expect(togglePermission(locked, "clients.view")).toBe(locked);
    expect(togglePermission(locked, "servers.edit")).toBe(locked);
  });

  it("ignores keys that don't exist", () => {
    const s = state(["clients.view"]);
    expect(togglePermission(s, "clients.fly")).toBe(s);
    expect(togglePermission(s, "payments.delete")).toBe(s); // Payments has no Delete
    expect(togglePermission(s, "nope.view")).toBe(s);
    expect(togglePermission(s, "noDot")).toBe(s);
  });

  it("does not mutate the input state", () => {
    const before = state(["clients.view"]);
    const snapshot = [...before.granted];
    togglePermission(before, "clients.edit");
    togglePermission(before, "clients.view");
    expect(before.granted).toEqual(snapshot);
  });

  it("keeps the result in catalog order", () => {
    let s = state();
    s = togglePermission(s, "servers.view");
    s = togglePermission(s, "clients.login_as");
    s = togglePermission(s, "clients.create");
    expect(s.granted).toEqual(["clients.view", "clients.create", "clients.login_as", "servers.view"]);
  });
});

describe("setModulePermissions", () => {
  it("grants every permission of a module", () => {
    expect(setModulePermissions(state(), "payments", true).granted).toEqual([
      "payments.view",
      "payments.create",
      "payments.edit",
      "payments.approve",
    ]);
  });

  it("clears every permission of a module and leaves others alone", () => {
    const before = state(["clients.view", "clients.login_as", "servers.view"]);
    expect(setModulePermissions(before, "clients", false).granted).toEqual(["servers.view"]);
  });

  it("returns the same state for a locked role or an unknown module", () => {
    const locked = state([], true);
    expect(setModulePermissions(locked, "clients", true)).toBe(locked);
    const s = state();
    expect(setModulePermissions(s, "nope", true)).toBe(s);
  });
});

describe("countModuleGranted", () => {
  it("counts only that module's granted permissions", () => {
    const clients = MODULES[0] as PermissionModule;
    expect(countModuleGranted(clients, ["clients.view", "clients.login_as", "servers.view"])).toBe(2);
  });
});
