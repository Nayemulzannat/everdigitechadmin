"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, EmptyState, Skeleton, StatusPill } from "@/components/ui";
import { useProductGroups, type ProductGroup } from "@/lib/api/products";
import { formatCount } from "@/lib/format";
import { DeleteGroupDialog, GroupFormDialog, type GroupFormMode } from "./group-dialogs";

export function GroupsView() {
  const { data, isPending, isError, refetch, isRefetching } = useProductGroups();
  const [form, setForm] = useState<GroupFormMode | null>(null);
  const [deleting, setDeleting] = useState<ProductGroup | null>(null);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link href="/products" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Products &amp; pricing
      </Link>

      <PageHeader
        eyebrow="Business"
        title="Product groups"
        description="The sections of the catalog. Each product belongs to one group."
        actions={
          <Can permission="products.create">
            <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} onClick={() => setForm({ type: "create" })}>
              Add group
            </Button>
          </Can>
        }
      />

      <Card padding="none">
        {isError ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Groups couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <div role="status" aria-label="Loading groups" className="flex flex-col">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-5 border-t border-divider px-5 py-4 first:border-t-0">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-32" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No groups yet" text="Add a group first (for example Web Hosting), then add products to it." />
        ) : (
          <ul className="divide-y divide-divider">
            {data.map((group) => (
              <li key={group.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-5 md:px-5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold">{group.name}</p>
                    <StatusPill tone={group.isActive ? "success" : "neutral"}>{group.isActive ? "Shown" : "Hidden"}</StatusPill>
                    <span className="text-xs text-text-muted">{group.typeLabel}</span>
                  </div>
                  {group.description ? <p className="text-sm text-text-muted">{group.description}</p> : null}
                  <p className="text-xs text-text-muted">
                    {group.productsCount > 0 ? (
                      <Link href={`/products?group=${group.id}`} className="font-semibold text-primary no-underline hover:underline">
                        {formatCount(group.productsCount)} {group.productsCount === 1 ? "product" : "products"}
                      </Link>
                    ) : (
                      "No products yet"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Can permission="products.edit">
                    <Button variant="secondary" size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setForm({ type: "edit", group })}>
                      Edit
                    </Button>
                  </Can>
                  <Can permission="products.delete">
                    <Button
                      iconOnly
                      variant="secondary"
                      size="sm"
                      aria-label={`Delete ${group.name}`}
                      title={group.productsCount > 0 ? "Has products: hide it instead" : "Delete"}
                      disabled={group.productsCount > 0}
                      onClick={() => setDeleting(group)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <GroupFormDialog mode={form} onClose={() => setForm(null)} />
      <DeleteGroupDialog group={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
