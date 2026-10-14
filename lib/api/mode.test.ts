import { describe, expect, it } from "vitest";
import { MOCK_AREAS, isMockArea } from "./mode";

describe("isMockArea", () => {
  it("mocks every area for true or all", () => {
    for (const area of MOCK_AREAS) {
      expect(isMockArea("true", area)).toBe(true);
      expect(isMockArea("all", area)).toBe(true);
      expect(isMockArea(" TRUE ", area)).toBe(true);
    }
  });

  it("mocks nothing when unset, empty or false", () => {
    for (const area of MOCK_AREAS) {
      expect(isMockArea(undefined, area)).toBe(false);
      expect(isMockArea("", area)).toBe(false);
      expect(isMockArea("false", area)).toBe(false);
    }
  });

  it("mocks only the listed areas", () => {
    expect(isMockArea("dashboard", "dashboard")).toBe(true);
    expect(isMockArea("dashboard", "auth")).toBe(false);
    expect(isMockArea("dashboard", "roles")).toBe(false);
    expect(isMockArea("dashboard", "clients")).toBe(false);

    expect(isMockArea("dashboard, Clients", "clients")).toBe(true);
    expect(isMockArea("dashboard,clients", "dashboard")).toBe(true);
    expect(isMockArea("dashboard,clients", "roles")).toBe(false);
  });

  it("does not match part of a name", () => {
    expect(isMockArea("dashboards", "dashboard")).toBe(false);
    expect(isMockArea("auth-extra", "auth")).toBe(false);
  });
});
