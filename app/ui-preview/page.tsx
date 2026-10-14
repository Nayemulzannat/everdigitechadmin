import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Development only: a gallery of every components/ui component in every state.
// In production builds NODE_ENV is inlined as "production", so the branch below (and the gallery module it
// imports) is dropped from the bundle and the route answers 404.
export const metadata: Metadata = { title: "UI preview", robots: { index: false, follow: false } };

export default async function UiPreviewPage() {
  if (process.env.NODE_ENV !== "production") {
    const { UiPreview } = await import("./ui-preview");
    return <UiPreview />;
  }
  notFound();
}
