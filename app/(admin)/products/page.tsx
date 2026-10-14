import { Suspense } from "react";
import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { ProductsView } from "./products-view";

export const metadata: Metadata = { title: "Products & pricing" };

// ProductsView reads its filters from the URL (useSearchParams), which needs a Suspense boundary.
export default function ProductsPage() {
  return (
    <RequirePermission permission="products.view">
      <Suspense>
        <ProductsView />
      </Suspense>
    </RequirePermission>
  );
}
