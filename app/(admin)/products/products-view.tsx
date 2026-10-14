"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, EmptyState, Pagination, ResponsiveTable, SearchInput, Select, Skeleton, StatusPill, Tabs, buttonVariants, type TableColumn } from "@/components/ui";
import { formatPaisa, useProductGroups, useProducts, type Product, type ProductsParams } from "@/lib/api/products";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { TaxDialog } from "./_components/tax-dialog";
import { DeleteProductDialog, ProductFormDialog, type ProductFormMode } from "./_components/product-dialogs";
import { useProductFilters } from "./_components/use-product-filters";

const SEARCH_DEBOUNCE_MS = 300;
const LIST_ID = "products-list";

const STATUS_TABS: { value: ProductsParams["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "On sale" },
  { value: "inactive", label: "Off" },
];

/** "৳899 Monthly" for the shortest cycle, and "+2 more" when there are others. */
function FromPrice({ product }: { product: Product }) {
  const first = product.prices[0];
  if (!first) return <span className="text-text-muted">No price</span>;

  return (
    <span className="whitespace-nowrap">
      <span className="font-bold tabular-nums">{formatPaisa(first.amount)}</span> <span className="text-text-muted">{first.label.toLowerCase()}</span>
      {product.prices.length > 1 ? <span className="ml-1.5 text-xs text-text-muted">+{product.prices.length - 1} more</span> : null}
    </span>
  );
}

function ProductStatus({ product }: { product: Product }) {
  return <StatusPill tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "On sale" : "Off"}</StatusPill>;
}

export function ProductsView() {
  const [taxOpen, setTaxOpen] = useState(false);
  const { filters, setFilters, clearFilters, hasFilters } = useProductFilters();
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching } = useProducts(filters);
  const groups = useProductGroups();
  const [form, setForm] = useState<ProductFormMode | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  // Search box: a local draft, written to the URL 300ms after typing stops (same approach as the other lists).
  const [draft, setDraft] = useState(filters.search);
  const [syncedSearch, setSyncedSearch] = useState(filters.search);
  const [lastWritten, setLastWritten] = useState<string | null>(null);
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    if (filters.search !== lastWritten) setDraft(filters.search);
  }

  useEffect(() => {
    if (draft.trim() === filters.search.trim()) return;
    const timer = window.setTimeout(() => {
      setLastWritten(draft.trim());
      setFilters({ search: draft }, { history: "replace" });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, filters.search, setFilters]);

  const columns: TableColumn<Product>[] = [
    {
      id: "product",
      header: "Product",
      headerClassName: "min-w-[220px]",
      cell: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="max-w-[260px] truncate">{p.name}</span>
            {p.isFeatured ? <Star aria-label="Featured" className="size-3.5 shrink-0 fill-warning text-warning" /> : null}
          </span>
          {p.tagline ? <span className="max-w-[300px] truncate text-xs text-text-muted">{p.tagline}</span> : null}
        </div>
      ),
    },
    { id: "group", header: "Group", cellClassName: "whitespace-nowrap text-text-secondary", cell: (p) => p.groupName ?? "—" },
    { id: "price", header: "Price from", cell: (p) => <FromPrice product={p} /> },
    { id: "status", header: "Status", cellClassName: "whitespace-nowrap", cell: (p) => <ProductStatus product={p} /> },
    {
      id: "actions",
      header: "Actions",
      srOnlyHeader: true,
      cell: (p) => (
        <div className="flex justify-end gap-1.5">
          <Can permission="products.edit">
            <Button variant="secondary" size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setForm({ type: "edit", product: p })}>
              Edit
            </Button>
          </Can>
          <Can permission="products.delete">
            <Button iconOnly variant="secondary" size="sm" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const counts = data?.counts;
  const tabs = STATUS_TABS.map((t) => ({ ...t, count: counts ? formatCount(counts[t.value]) : undefined, panelId: LIST_ID }));
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        eyebrow="Business"
        title="Products & pricing"
        description="What clients can buy, and what it costs for each billing cycle."
        actions={
          <>
            <Can permission="settings.edit">
              <Button variant="secondary" onClick={() => setTaxOpen(true)}>
                Tax (VAT)
              </Button>
            </Can>
            <Link href="/products/groups" className={buttonVariants({ variant: "secondary" })}>
              Groups
            </Link>
            <Can permission="products.create">
              <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} onClick={() => setForm({ type: "create", groupId: filters.group !== "all" ? filters.group : undefined })}>
                Add product
              </Button>
            </Can>
          </>
        }
      />

      <TaxDialog open={taxOpen} onClose={() => setTaxOpen(false)} />

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-5">
          <Tabs aria-label="Product status" value={filters.status} onValueChange={(status) => setFilters({ status })} items={tabs} />
          <div className="flex flex-col gap-2.5 md:ml-auto md:flex-row md:items-center">
            <Select label="Group" hideLabel value={filters.group} onChange={(e) => setFilters({ group: e.target.value })} className="md:w-52">
              <option value="all">All groups</option>
              {groups.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 md:w-[280px]">
              <SearchInput label="Search products" placeholder="Name or short line" value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="search" />
            </form>
          </div>
        </div>

        {isError && !data ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Products couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <div role="status" aria-label="Loading products" className="flex flex-col">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex h-[69px] items-center gap-6 border-t border-divider px-5 first:border-t-0">
                <div className="flex w-[260px] flex-col gap-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-6 w-20 rounded-pill" />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveTable
            id={LIST_ID}
            caption="Products"
            columns={columns}
            rows={data.items}
            getRowKey={(p) => p.id}
            renderMobileRow={(p) => (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-bold break-words">{p.name}</span>
                    <span className="text-xs text-text-muted">{p.groupName}</span>
                  </div>
                  <ProductStatus product={p} />
                </div>
                <FromPrice product={p} />
                <div className="flex gap-2">
                  <Can permission="products.edit">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setForm({ type: "edit", product: p })}>
                      Edit
                    </Button>
                  </Can>
                  <Can permission="products.delete">
                    <Button iconOnly variant="secondary" size="sm" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </Can>
                </div>
              </div>
            )}
            minWidth={820}
            compact
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
            empty={
              <EmptyState
                title={hasFilters ? "No products match these filters" : "No products yet"}
                text={hasFilters ? "Try another status or group, or clear the search." : "Add a group first, then add the products clients can buy."}
                action={
                  hasFilters ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraft("");
                        setLastWritten(null);
                        clearFilters();
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
            footer={
              data.total > 0 ? (
                <>
                  <span aria-live="polite" className="text-[13px] text-text-muted">
                    Showing {formatCount(first)}–{formatCount(last)} of {formatCount(data.total)} {data.total === 1 ? "product" : "products"}
                  </span>
                  <Pagination page={data.page} pageCount={data.pageCount} onPageChange={(page) => setFilters({ ...filters, page })} />
                </>
              ) : undefined
            }
          />
        )}
      </Card>

      <ProductFormDialog mode={form} onClose={() => setForm(null)} />
      <DeleteProductDialog product={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
