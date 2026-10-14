// Permission catalog types. Keys are `module.action`, e.g. "clients.view", "invoices.refund".

export type PermissionAction = "view" | "create" | "edit" | "delete";

/** `module.action`, e.g. "clients.view", "invoices.refund", "services.server_login". */
export type PermissionKey = `${string}.${string}`;

export interface PermissionModule {
  key: string;
  label: string;
  description: string;
  /** The subset of View / Create / Edit / Delete this module has. */
  actions: PermissionAction[];
  /** At most one extra permission, e.g. { action: "refund", label: "Issue refunds" }. */
  special: { action: string; label: string } | null;
}
