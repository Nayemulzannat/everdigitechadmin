"use client";

import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  countModuleGranted,
  moduleKeys,
  permissionKey,
  type PermissionModule,
} from "@/lib/permissions";

export interface PermissionMatrixProps {
  modules: readonly PermissionModule[];
  granted: readonly string[];
  locked: boolean;
  onToggle: (key: string) => void;
  onSetModule: (moduleKey: string, on: boolean) => void;
}

const TH = "px-2 py-3 text-xs font-bold tracking-[0.06em] text-text-muted uppercase";

/** md+: Module · View · Create · Edit · Delete · Special, with "—" where an action doesn't exist. */
export function PermissionTable({ modules, granted, locked, onToggle }: PermissionMatrixProps) {
  const has = new Set(granted);
  return (
    // relative: keeps the sr-only labels inside the scroller instead of widening the page.
    <div className="relative hidden overflow-x-auto md:block">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">Permissions for this role</caption>
        <thead>
          <tr className="bg-surface-muted">
            <th scope="col" className={`${TH} pl-6 text-left`}>
              Module
            </th>
            {PERMISSION_ACTIONS.map((a) => (
              <th key={a} scope="col" className={`${TH} w-16 text-center`}>
                {PERMISSION_ACTION_LABELS[a]}
              </th>
            ))}
            <th scope="col" className={`${TH} pr-6 pl-4 text-left`}>
              Special
            </th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.key} className="border-t border-divider transition-colors hover:bg-surface-muted">
              <th scope="row" className="py-2.5 pr-2 pl-6 text-left font-normal">
                <div className="font-bold">{m.label}</div>
                <div className="text-xs text-text-muted">{m.description}</div>
              </th>
              {PERMISSION_ACTIONS.map((a) => {
                const key = permissionKey(m.key, a);
                return (
                  <td key={a} className="p-0 text-center">
                    {m.actions.includes(a) ? (
                      <Checkbox
                        hideLabel
                        label={`${m.label}: ${PERMISSION_ACTION_LABELS[a]}`}
                        checked={has.has(key)}
                        disabled={locked}
                        onChange={() => onToggle(key)}
                      />
                    ) : (
                      <>
                        <span aria-hidden="true" className="text-text-subtle">
                          —
                        </span>
                        <span className="sr-only">Not available</span>
                      </>
                    )}
                  </td>
                );
              })}
              <td className="py-0 pr-6 pl-4">
                {m.special ? (
                  <Checkbox
                    label={m.special.label}
                    checked={has.has(permissionKey(m.key, m.special.action))}
                    disabled={locked}
                    onChange={() => m.special && onToggle(permissionKey(m.key, m.special.action))}
                    className="[&_label]:text-[13px] [&_label]:font-semibold"
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Below md: one collapsible card per module with a count, "Select all" and a 44px row per permission. */
export function PermissionAccordion({ modules, granted, locked, onToggle, onSetModule }: PermissionMatrixProps) {
  const has = new Set(granted);
  return (
    <ul aria-label="Permissions for this role" className="flex flex-col gap-2.5 p-4 md:hidden">
      {modules.map((m) => {
        const keys = moduleKeys(m);
        const count = countModuleGranted(m, granted);
        const rows = [
          ...m.actions.map((a) => ({ key: permissionKey(m.key, a), label: PERMISSION_ACTION_LABELS[a] })),
          ...(m.special ? [{ key: permissionKey(m.key, m.special.action), label: m.special.label }] : []),
        ];
        return (
          <li key={m.key}>
            <details className="group rounded-control border border-border bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-control px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">{m.label}</span>
                  <span className="truncate text-xs text-text-muted">{m.description}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-text-secondary tabular-nums">
                  {count} of {keys.length}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-text-muted motion-safe:transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="flex flex-col border-t border-divider px-4 pb-2">
                <Checkbox
                  label={<span className="font-bold text-text">Select all</span>}
                  aria-label={`Select all ${m.label} permissions`}
                  checked={count === keys.length}
                  indeterminate={count > 0 && count < keys.length}
                  disabled={locked}
                  onChange={(e) => onSetModule(m.key, e.target.checked)}
                  className="border-b border-divider [&>label]:w-full"
                />
                {rows.map((row) => (
                  <Checkbox
                    key={row.key}
                    label={row.label}
                    checked={has.has(row.key)}
                    disabled={locked}
                    onChange={() => onToggle(row.key)}
                    className="[&>label]:w-full"
                  />
                ))}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
