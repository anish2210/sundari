import type { Metadata } from "next";
import { ProductExplorer } from "@/components/commerce/product-explorer";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Jewellery",
  description: "Browse Sundari Jewels gold, diamond, bridal, and everyday jewellery collections.",
  path: "/products"
});

export default function ProductsPage() {
  return <ProductExplorer />;
}
